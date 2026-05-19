import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  updateDoc, doc, deleteDoc, getDocs, writeBatch,
  getDoc, setDoc // 🧠 Importações novas para a Inteligência
} from 'firebase/firestore';
import { signOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { db, auth } from './firebase';

import { 
  ShoppingCart, Trash2, LogOut, Sun, Moon, 
  Plus, Search, CheckCircle2, Circle, X, ScanLine, Tag, Pencil, Check,
  EyeOff, ChevronUp, ChevronDown, RefreshCcw, ArrowUp, LineChart,
  Copy, Share2, Barcode, Camera, AlertCircle
} from 'lucide-react';

interface Item {
  id: string;
  name: string;
  brand?: string;
  price: number;
  quantity: number;
  measure?: string;
  unit: string;
  isChecked: boolean;
  category: string;
}

const CATEGORIAS = ['🍎 Hortifruti', '🥩 Açougue', '🧀 Frios e Laticínios', '🍚 Mercearia', '🧹 Limpeza', '🧻 Higiene', '🥤 Bebidas', '📦 Outros'];
const UNIDADES = ['un', 'kg', 'g'];

const DICIONARIO_CATEGORIAS: Record<string, string> = {
  'arroz': CATEGORIAS[3], 'feijão': CATEGORIAS[3], 'macarrão': CATEGORIAS[3], 'óleo': CATEGORIAS[3], 'açúcar': CATEGORIAS[3], 'café': CATEGORIAS[3], 'sal': CATEGORIAS[3],
  'carne': CATEGORIAS[1], 'frango': CATEGORIAS[1], 'peixe': CATEGORIAS[1], 'porco': CATEGORIAS[1], 'picanha': CATEGORIAS[1], 'linguiça': CATEGORIAS[1], 'salsicha': CATEGORIAS[1],
  'leite': CATEGORIAS[2], 'queijo': CATEGORIAS[2], 'presunto': CATEGORIAS[2], 'manteiga': CATEGORIAS[2], 'iogurte': CATEGORIAS[2], 'requeijão': CATEGORIAS[2], 'danone': CATEGORIAS[2],
  'banana': CATEGORIAS[0], 'maçã': CATEGORIAS[0], 'cebola': CATEGORIAS[0], 'tomate': CATEGORIAS[0], 'batata': CATEGORIAS[0], 'alho': CATEGORIAS[0], 'limão': CATEGORIAS[0],
  'detergente': CATEGORIAS[4], 'sabão': CATEGORIAS[4], 'amaciante': CATEGORIAS[4], 'desinfetante': CATEGORIAS[4], 'água sanitária': CATEGORIAS[4], 'esponja': CATEGORIAS[4],
  'sabonete': CATEGORIAS[5], 'shampoo': CATEGORIAS[5], 'papel higiênico': CATEGORIAS[5], 'creme dental': CATEGORIAS[5], 'desodorante': CATEGORIAS[5], 'pasta de dente': CATEGORIAS[5],
  'coca': CATEGORIAS[6], 'cerveja': CATEGORIAS[6], 'suco': CATEGORIAS[6], 'água': CATEGORIAS[6], 'refrigerante': CATEGORIAS[6], 'vinho': CATEGORIAS[6]
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [prevMonthPrices, setPrevMonthPrices] = useState<Record<string, number>>({});
  
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemMeasure, setNewItemMeasure] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('un');
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIAS[3]);
  
  // 🧠 ESTADO NOVO: Memória do Código de Barras Escaneado
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const [totalSpent, setTotalSpent] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [hideChecked, setHideChecked] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sessionCheckedIds, setSessionCheckedIds] = useState<Set<string>>(new Set());

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<{month: string, price: number}[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItemName, setHistoryItemName] = useState('');
  
  // 📸 ESTADOS PARA FOTO DA NOTA (FASE 2)
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (!newItemName) return;
    const lowerName = newItemName.toLowerCase();
    for (const [key, category] of Object.entries(DICIONARIO_CATEGORIAS)) {
      if (lowerName.includes(key)) {
        setNewItemCategory(category);
        break;
      }
    }
  }, [newItemName]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userBasePath = `users/${user.uid}`;

    const fetchPrevPrices = async () => {
      const date = new Date(currentMonth + \"-01\");
      date.setMonth(date.getMonth() - 1); 
      const prevMonthStr = date.toISOString().slice(0, 7);
      const prevItemsRef = collection(db, `${userBasePath}/lists/${prevMonthStr}/items`);
      const unsubscribePrev = onSnapshot(prevItemsRef, (snap) => {
        const prices: Record<string, number> = {};
        snap.forEach(d => prices[d.data().name.toLowerCase()] = d.data().price);
        setPrevMonthPrices(prices);
      });
      return unsubscribePrev;
    };

    const q = query(collection(db, `${userBasePath}/lists/${currentMonth}/items`), orderBy(\"createdAt\", \"desc\"));
    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      let currentTotal = 0;
      const fetchedItems = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        if (data.isChecked) currentTotal += (data.price || 0) * (data.quantity || 1);
        return { id: docSnap.id, ...data } as Item;
      });
      setItems(fetchedItems);
      setTotalSpent(currentTotal);
    });

    fetchPrevPrices();
    return () => unsubscribeItems();
  }, [user, currentMonth]);

  // [Arquivo truncado - versão completa no repositório]

  if (!user) {
    return (
      <div className=\"min-h-screen bg-linear-to-br from-emerald-600 to-teal-900 flex flex-col justify-center items-center p-4\">
        <div className=\"text-center mb-8\">
          <ShoppingCart className=\"w-16 h-16 text-white mx-auto mb-4\" />
          <h1 className=\"text-4xl font-bold text-white mb-2\">Rancho Smart</h1>
          <p className=\"text-emerald-100 text-lg\">Gerenciador de Compras Inteligente</p>
        </div>
        <form onSubmit={handleLogin} className=\"bg-white/10 p-8 rounded-3xl backdrop-blur-xl border border-white/20 w-full max-w-md\">
          <input type=\"email\" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=\"Email\" className=\"w-full p-3 mb-4 rounded-lg bg-white/90 border-0\" required />
          <input type=\"password\" value={password} onChange={(e) => setPassword(e.target.value)} placeholder=\"Senha\" className=\"w-full p-3 mb-6 rounded-lg bg-white/90 border-0\" required />
          <button type=\"submit\" className=\"w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-bold transition-all\">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgApp} transition-colors duration-300`}>
      {/* Renderização do app quando autenticado */}
      <div className=\"max-w-2xl mx-auto p-4 space-y-6\">
        <div className=\"flex justify-between items-center mb-6\">
          <h1 className=\"text-3xl font-bold\">🛒 Minha Lista</h1>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className=\"p-2\">
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
