import { GoogleGenerativeAI } from '@google/generative-ai';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Método não permitido' };

  try {
    const { image } = JSON.parse(event.body); // image deve ser base64 sem o prefixo data:image/...
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: \"gemini-1.5-flash\" });

    const prompt = `
      Analise esta foto de uma nota fiscal ou cupom fiscal de mercado brasileiro.
      Extraia os produtos comprados e retorne APENAS um JSON no seguinte formato:
      {
        \"items\": [
          {
            \"name\": \"Nome do produto (limpo, ex: Arroz Agulhinha)\",
            \"brand\": \"Marca (se houver, ex: Tio João)\",
            \"quantity\": 1,
            \"measure\": \"Peso ou volume (ex: 5kg, 1L, 900g)\",
            \"price\": 10.50,
            \"unit\": \"un ou kg\"
          }
        ]
      }
      
      Regras importantes:
      1. Ignore impostos, descontos (se o preço já estiver líquido), CPF, endereço e dados do mercado.
      2. Se houver desconto na linha abaixo do produto, use o valor final pago pelo item.
      3. Se não conseguir identificar a marca, deixe o campo \"brand\" como string vazia.
      4. O campo \"price\" deve ser um número (float).
      5. Retorne APENAS o JSON, sem markdown ou explicações.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image,
          mimeType: \"image/jpeg\"
        }
      }
    ]);

    const response = await result.response;
    let text = response.text();
    
    // Limpeza básica caso a IA coloque markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return {
      statusCode: 200,
      body: text
    };

  } catch (error) {
    console.error('Erro Gemini:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao processar imagem: ' + error.message })
    };
  }
};
