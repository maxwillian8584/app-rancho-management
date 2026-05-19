import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Método não permitido' };

  try {
    const { url } = JSON.parse(event.body);
    const agent = new https.Agent({ rejectUnauthorized: false });

    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      timeout: 15000 
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const extractedItems = [];

    // Função auxiliar para extrair marca e peso do nome
    const parseDetails = (fullName) => {
      let name = fullName;
      let brand = '';
      let weight = '';

      // Tenta achar peso (ex: 1kg, 500g, 2.5L, 900ml)
      const weightMatch = name.match(/(\d+[.,]?\d*\s?(?:kg|g|l|ml|un|mts))/i);
      if (weightMatch) {
        weight = weightMatch[0].trim();
        name = name.replace(weightMatch[0], '').trim();
      }

      // Tenta achar marca (geralmente a última palavra ou algo entre parênteses)
      // Esta é uma heurística simples, a IA na Fase 2 será muito melhor nisso.
      const words = name.split(' ');
      if (words.length > 2) {
        // Assume que se tiver marca em parênteses, é ela
        const brandMatch = name.match(/\((.*?)\)/);
        if (brandMatch) {
          brand = brandMatch[1];
          name = name.replace(brandMatch[0], '').trim();
        }
      }

      return { name: name.replace(/\s+/g, ' ').trim(), brand, weight };
    };

    // Seletores variados para diferentes estados (RS, SP, PR, etc)
    const selectors = [
      { name: '.txtTit', price: '.RvlUnit', qty: '.Rqtd', row: 'tr' }, // RS Padrão
      { name: '.item-nome', price: '.item-valor', qty: '.item-qtd', row: '.item-linha' }, // Alternativo
      { name: 'td:nth-child(2) span:first-child', price: 'td:nth-child(4)', qty: 'td:nth-child(3)', row: 'tr' } // Genérico
    ];

    let foundWithSelector = false;

    for (const sel of selectors) {
      if ($(sel.name).length > 0) {
        $(sel.name).each((index, element) => {
          const rawName = $(element).text().trim();
          if (rawName && !rawName.toLowerCase().includes('total') && !rawName.toLowerCase().includes('desconto')) {
            const container = $(element).closest(sel.row).length > 0 ? $(element).closest(sel.row) : $(element).parent().parent();
            
            const rawPrice = container.find(sel.price).text() || '0';
            const cleanPriceMatch = rawPrice.match(/[\d,.]+/);
            const cleanPrice = cleanPriceMatch ? cleanPriceMatch[0].replace('.', '').replace(',', '.') : '0';
            
            const rawQtd = container.find(sel.qty).text() || '1';
            const cleanQtdMatch = rawQtd.match(/[\d,.]+/);
            const cleanQtd = cleanQtdMatch ? cleanQtdMatch[0].replace(',', '.') : '1';

            const details = parseDetails(rawName);

            extractedItems.push({
              name: details.name,
              brand: details.brand,
              measure: details.weight,
              price: parseFloat(cleanPrice) || 0,
              quantity: parseFloat(cleanQtd) || 1
            });
          }
        });
        if (extractedItems.length > 0) {
          foundWithSelector = true;
          break;
        }
      }
    }

    if (extractedItems.length === 0) {
      const pageTitle = $('title').text().trim() || 'Página sem título';
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          error: `Não foi possível extrair itens automaticamente.\nTítulo: \"${pageTitle}\"\nLayout desconhecido.` 
        }) 
      };
    }

    return { statusCode: 200, body: JSON.stringify({ items: extractedItems }) };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erro ao conectar na SEFAZ: ' + error.message }) };
  }
};
