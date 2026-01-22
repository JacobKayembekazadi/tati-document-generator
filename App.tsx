import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Package,
  Truck,
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
  Printer,
  Plus,
  Trash2,
  Building2,
  DollarSign,
  LayoutDashboard,
  CheckCircle2,
  History,
  FileDown,
  Info,
  ClipboardList,
  FlaskConical,
  ListChecks,
  Copy,
  Check,
  MessageCircle,
  Send,
  Bot,
  User,
  Key,
  Sparkles,
  RefreshCw,
  Eye,
  Calendar,
  X,
} from 'lucide-react';
import OpenAI from 'openai';
import {
  ShipmentFormData,
  ShipmentCalculations,
  DocumentTab,
  LineItem,
  PackagingType,
  AppView,
  ChatMessage,
  SavedShipment,
} from './types';
import {
  PRODUCT_DATABASE,
  EXPORTER_INFO,
  PERSONNEL,
  PACKAGING_STANDARDS,
  MAX_GROSS_WEIGHT_KG,
  ERG_NUMBERS,
  PROPER_SHIPPING_NAMES,
  getProductById,
  generateLotNumber,
  generateLabId,
} from './constants';

// Markdown-like formatting for chat messages
const FormattedMessage: React.FC<{ content: string; isUser?: boolean }> = ({ content, isUser }) => {
  const formatContent = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
    let i = 0;
    let listItems: string[] = [];
    let isOrderedList = false;
    let tableRows: string[][] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    const flushList = () => {
      if (listItems.length > 0) {
        const ListTag = isOrderedList ? 'ol' : 'ul';
        elements.push(
          <ListTag key={`list-${i}`} className={`my-2 ${isOrderedList ? 'list-decimal' : 'list-disc'} list-inside space-y-1`}>
            {listItems.map((item, idx) => (
              <li key={idx} className="text-sm">{formatInlineText(item)}</li>
            ))}
          </ListTag>
        );
        listItems = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(2); // Skip header and separator
        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto">
            <table className={`w-full text-xs border-collapse ${isUser ? 'border-blue-400' : 'border-slate-300'}`}>
              <thead>
                <tr className={isUser ? 'bg-blue-500/30' : 'bg-slate-100'}>
                  {headerRow.map((cell, idx) => (
                    <th key={idx} className={`px-3 py-2 text-left font-bold border ${isUser ? 'border-blue-400' : 'border-slate-300'}`}>
                      {cell.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? '' : (isUser ? 'bg-blue-500/10' : 'bg-slate-50')}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className={`px-3 py-2 border ${isUser ? 'border-blue-400' : 'border-slate-300'}`}>
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <div key={`code-${i}`} className="my-3">
            {codeBlockLang && (
              <div className={`text-[10px] font-mono px-3 py-1 rounded-t-lg ${isUser ? 'bg-blue-800 text-blue-200' : 'bg-slate-700 text-slate-300'}`}>
                {codeBlockLang}
              </div>
            )}
            <pre className={`p-3 rounded-lg ${codeBlockLang ? 'rounded-t-none' : ''} overflow-x-auto text-xs font-mono ${isUser ? 'bg-blue-800/50 text-blue-100' : 'bg-slate-800 text-slate-100'}`}>
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlockContent = [];
        codeBlockLang = '';
      }
    };

    const formatInlineText = (text: string): React.ReactNode => {
      // Process inline formatting
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let keyCounter = 0;

      while (remaining.length > 0) {
        // Bold: **text** or __text__
        const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
        if (boldMatch) {
          parts.push(<strong key={keyCounter++} className="font-bold">{boldMatch[2]}</strong>);
          remaining = remaining.slice(boldMatch[0].length);
          continue;
        }

        // Italic: *text* or _text_
        const italicMatch = remaining.match(/^(\*|_)([^*_]+?)\1/);
        if (italicMatch) {
          parts.push(<em key={keyCounter++} className="italic">{italicMatch[2]}</em>);
          remaining = remaining.slice(italicMatch[0].length);
          continue;
        }

        // Inline code: `code`
        const codeMatch = remaining.match(/^`([^`]+)`/);
        if (codeMatch) {
          parts.push(
            <code key={keyCounter++} className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${isUser ? 'bg-blue-500/30' : 'bg-slate-200 text-slate-700'}`}>
              {codeMatch[1]}
            </code>
          );
          remaining = remaining.slice(codeMatch[0].length);
          continue;
        }

        // Link: [text](url)
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          parts.push(
            <a key={keyCounter++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className={`underline ${isUser ? 'text-blue-200' : 'text-blue-600'}`}>
              {linkMatch[1]}
            </a>
          );
          remaining = remaining.slice(linkMatch[0].length);
          continue;
        }

        // Regular character
        const nextSpecial = remaining.slice(1).search(/[\*_`\[]/);
        if (nextSpecial === -1) {
          parts.push(remaining);
          break;
        } else {
          parts.push(remaining.slice(0, nextSpecial + 1));
          remaining = remaining.slice(nextSpecial + 1);
        }
      }

      return parts.length === 1 ? parts[0] : <>{parts}</>;
    };

    while (i < lines.length) {
      const line = lines[i];

      // Code block start/end
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          flushTable();
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
        }
        i++;
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        i++;
        continue;
      }

      // Table row
      if (line.includes('|') && line.trim().startsWith('|')) {
        flushList();
        const cells = line.split('|').slice(1, -1);
        if (!line.match(/^\|[\s-:|]+\|$/)) {
          tableRows.push(cells);
        } else {
          tableRows.push(cells); // Keep separator for processing
        }
        i++;
        continue;
      } else if (tableRows.length > 0) {
        flushTable();
      }

      // Heading
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm', 'text-xs'];
        elements.push(
          <p key={`h-${i}`} className={`${sizes[level - 1]} font-bold my-2`}>
            {formatInlineText(headingMatch[2])}
          </p>
        );
        i++;
        continue;
      }

      // Unordered list item
      if (line.match(/^[\s]*[-*•]\s+/)) {
        if (listItems.length > 0 && isOrderedList) {
          flushList();
        }
        isOrderedList = false;
        listItems.push(line.replace(/^[\s]*[-*•]\s+/, ''));
        i++;
        continue;
      }

      // Ordered list item
      if (line.match(/^[\s]*\d+[.)]\s+/)) {
        if (listItems.length > 0 && !isOrderedList) {
          flushList();
        }
        isOrderedList = true;
        listItems.push(line.replace(/^[\s]*\d+[.)]\s+/, ''));
        i++;
        continue;
      }

      // Flush any pending list
      flushList();

      // Empty line
      if (line.trim() === '') {
        elements.push(<br key={`br-${i}`} />);
        i++;
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="text-sm my-1">
          {formatInlineText(line)}
        </p>
      );
      i++;
    }

    // Flush remaining
    flushList();
    flushTable();
    flushCodeBlock();

    return elements;
  };

  return <div className="space-y-1">{formatContent(content)}</div>;
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('builder');
  const [activeDoc, setActiveDoc] = useState<DocumentTab>('summary');
  const [copiedDoc, setCopiedDoc] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your TATI shipping assistant. I can help you:\n\n• Create shipments (e.g., \"Create shipment for 20 totes of TATI Y-07 to Pemex\")\n• Answer questions about products (e.g., \"What's the UN number for TATI CLR-07?\")\n• Explain documents and requirements\n• Auto-fill customer information\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Saved shipments state
  const [savedShipments, setSavedShipments] = useState<SavedShipment[]>(() => {
    const saved = localStorage.getItem('saved_shipments');
    return saved ? JSON.parse(saved) : [];
  });

  const [formData, setFormData] = useState<ShipmentFormData>({
    items: [
      {
        id: Date.now(),
        productId: 'P13',
        quantity: 20,
        unitType: 'totes',
        unitPrice: 2450.0,
        lotNumber: generateLotNumber(),
      },
    ],
    customerName: '',
    mexicoAddress: '',
    laredoAddress: '',
    customerPhone: '',
    customerEmail: '',
    rfc: '',
    laredoContactName: '',
    laredoContactPhone: '',
    shipDate: new Date().toISOString().split('T')[0],
    poNumber: '',
    carrier: 'ARMSTRONG',
    broker: 'BRAX LOGISTICS',
    loadNumber: '',
    itnNumber: '',
    baseInvoice: '9400',
    sequence: '1',
  });

  const calculations = useMemo<ShipmentCalculations>(() => {
    let totalNetWeight = 0;
    let totalTareWeight = 0;
    let totalValue = 0;
    let totalPallets = 0;
    let totalQuantity = 0;
    let hasHazmat = false;

    const items = formData.items.map((item) => {
      const product = getProductById(item.productId);
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const isTote = item.unitType === 'totes';

      const netWeight = isTote ? product.kgPerTote * qty : product.kgPerDrum * qty;
      const tareWeight = isTote
        ? PACKAGING_STANDARDS.toteTareKg * qty
        : PACKAGING_STANDARDS.drumTareKg * qty;
      const grossWeight = netWeight + tareWeight;
      const itemValue = price * qty;
      const pallets = isTote ? qty : Math.ceil(qty / PACKAGING_STANDARDS.drumsPerPallet);

      totalNetWeight += netWeight;
      totalTareWeight += tareWeight;
      totalValue += itemValue;
      totalPallets += pallets;
      totalQuantity += qty;

      if (product.unNumber !== 'Not regulated') {
        hasHazmat = true;
      }

      return {
        ...item,
        product,
        netWeight,
        tareWeight,
        grossWeight,
        totalValue: itemValue,
        pallets,
      };
    });

    return {
      items,
      totalNetWeight,
      totalTareWeight,
      totalGrossWeight: totalNetWeight + totalTareWeight,
      totalValue,
      totalPallets,
      totalQuantity,
      hasHazmat,
      invoiceNumber: `${formData.baseInvoice}.${formData.sequence}`,
      isOverweight: totalNetWeight + totalTareWeight > MAX_GROSS_WEIGHT_KG,
    };
  }, [formData]);

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          productId: 'P01',
          quantity: 1,
          unitType: 'totes' as PackagingType,
          unitPrice: 0,
          lotNumber: generateLotNumber(),
        },
      ],
    }));
  };

  const handleRemoveItem = (id: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const updateItem = (id: number, field: keyof LineItem, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          let finalValue: string | number = value;
          if (field === 'quantity' || field === 'unitPrice') {
            finalValue = value === '' ? 0 : parseFloat(value as string);
          }
          return { ...item, [field]: finalValue };
        }
        return item;
      }),
    }));
  };

  const formatDate = (
    dateStr: string,
    format: 'long' | 'short' | 'mmddyy' | 'mmddyyyy' | 'spanish' | 'iso'
  ): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    switch (format) {
      case 'long':
        return date
          .toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase();
      case 'short':
        return date
          .toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          })
          .toUpperCase();
      case 'mmddyy':
        return date.toLocaleDateString('en-US', {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'UTC',
        });
      case 'mmddyyyy':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'UTC',
        });
      case 'spanish':
        return date.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });
      case 'iso':
        return dateStr;
      default:
        return dateStr;
    }
  };

  const currentYear = new Date(formData.shipDate + 'T00:00:00').getFullYear();
  const labId = generateLabId(formData.shipDate);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    }
  }, [apiKey]);

  // Save shipments to localStorage when they change
  useEffect(() => {
    localStorage.setItem('saved_shipments', JSON.stringify(savedShipments));
  }, [savedShipments]);

  // Save current shipment
  const handleSaveShipment = () => {
    const newShipment: SavedShipment = {
      id: Date.now().toString(),
      invoiceNumber: calculations.invoiceNumber,
      customerName: formData.customerName || 'Unknown Customer',
      shipDate: formData.shipDate,
      totalValue: calculations.totalValue,
      totalGrossWeight: calculations.totalGrossWeight,
      itemCount: calculations.items.length,
      products: calculations.items.map((item) => item.product.name),
      createdAt: new Date(),
      formData: { ...formData },
    };
    setSavedShipments((prev) => [newShipment, ...prev]);
  };

  // Load a saved shipment
  const handleLoadShipment = (shipment: SavedShipment) => {
    setFormData(shipment.formData);
    setView('builder');
  };

  // Delete a saved shipment
  const handleDeleteShipment = (id: string) => {
    setSavedShipments((prev) => prev.filter((s) => s.id !== id));
  };

  // OpenAI Chat function
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    if (!apiKey) {
      setShowApiKeyInput(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    // Add loading message
    const loadingMessage: ChatMessage = {
      id: 'loading',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    setChatMessages((prev) => [...prev, loadingMessage]);

    try {
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      const systemPrompt = `You are a helpful assistant for Texas American Trade, Inc. (TATI), a company that exports petroleum chemical additives from Houston, TX to Mexico via Laredo.

PRODUCTS DATABASE (22 products):
${PRODUCT_DATABASE.map((p) => `- ${p.name} (ID: ${p.id}): UN# ${p.unNumber}, Hazard Class: ${p.hazardClass}, Density: ${p.density}, Tote: ${p.kgPerTote}kg, Drum: ${p.kgPerDrum}kg`).join('\n')}

CURRENT SHIPMENT INFO:
- Invoice: ${calculations.invoiceNumber}
- Customer: ${formData.customerName || 'Not set'}
- Ship Date: ${formData.shipDate}
- Products: ${calculations.items.map((i) => `${i.quantity} ${i.unitType} of ${i.product.name}`).join(', ')}
- Total Value: $${calculations.totalValue.toLocaleString()}
- Total Weight: ${calculations.totalGrossWeight.toLocaleString()} KG
- Has Hazmat: ${calculations.hasHazmat ? 'Yes' : 'No'}

When users ask to CREATE a shipment, respond with a JSON block in this format:
\`\`\`json
{
  "action": "create_shipment",
  "items": [{"productId": "P13", "quantity": 20, "unitType": "totes", "unitPrice": 2450}],
  "customerName": "Customer Name",
  "mexicoAddress": "Address in Mexico",
  "rfc": "RFC123456ABC"
}
\`\`\`

When users ask to UPDATE customer info, respond with:
\`\`\`json
{
  "action": "update_customer",
  "customerName": "New Name",
  "mexicoAddress": "New Address",
  "rfc": "RFC123"
}
\`\`\`

Be helpful, concise, and knowledgeable about international shipping, hazmat regulations, and Mexican customs requirements.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatMessages.filter((m) => !m.isLoading).map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: chatInput },
        ],
        max_tokens: 1000,
      });

      const assistantContent = response.choices[0]?.message?.content || 'Sorry, I could not process that request.';

      // Check for JSON actions in the response
      const jsonMatch = assistantContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const actionData = JSON.parse(jsonMatch[1]);

          if (actionData.action === 'create_shipment') {
            const newItems = actionData.items.map((item: { productId: string; quantity: number; unitType: string; unitPrice: number }) => ({
              id: Date.now() + Math.random(),
              productId: item.productId,
              quantity: item.quantity,
              unitType: item.unitType as PackagingType,
              unitPrice: item.unitPrice || 0,
              lotNumber: generateLotNumber(),
            }));

            setFormData((prev) => ({
              ...prev,
              items: newItems,
              customerName: actionData.customerName || prev.customerName,
              mexicoAddress: actionData.mexicoAddress || prev.mexicoAddress,
              rfc: actionData.rfc || prev.rfc,
            }));
          } else if (actionData.action === 'update_customer') {
            setFormData((prev) => ({
              ...prev,
              customerName: actionData.customerName || prev.customerName,
              mexicoAddress: actionData.mexicoAddress || prev.mexicoAddress,
              rfc: actionData.rfc || prev.rfc,
            }));
          }
        } catch {
          // JSON parsing failed, just show the message
        }
      }

      // Remove loading message and add actual response
      setChatMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: assistantContent.replace(/```json\n[\s\S]*?\n```/g, '').trim() || 'Done! I\'ve updated the shipment for you.',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev.filter((m) => m.id !== 'loading'),
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to OpenAI. Please check your API key.'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopyDocument = (docId: string) => {
    const docElement = document.getElementById(`doc-${docId}`);
    if (docElement) {
      const text = docElement.innerText;
      navigator.clipboard.writeText(text).then(() => {
        setCopiedDoc(docId);
        setTimeout(() => setCopiedDoc(null), 2000);
      });
    }
  };

  const documentTabs: { id: DocumentTab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'summary', label: 'Summary', icon: <ClipboardList size={14} />, show: true },
    { id: 'invoice', label: 'Invoice', icon: <DollarSign size={14} />, show: true },
    { id: 'packing', label: 'Packing List', icon: <Package size={14} />, show: true },
    { id: 'usmca', label: 'USMCA', icon: <ShieldCheck size={14} />, show: true },
    { id: 'bol', label: 'Bill of Lading', icon: <Truck size={14} />, show: true },
    { id: 'coq', label: 'COQ (Spanish)', icon: <FlaskConical size={14} />, show: true },
    { id: 'hazmat', label: 'Hazmat', icon: <AlertTriangle size={14} />, show: calculations.hasHazmat },
    { id: 'reminders', label: 'Reminders', icon: <ListChecks size={14} />, show: true },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-[#0f172a] text-white p-4 shadow-xl sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl italic shadow-inner">
                T
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none tracking-tight">
                  TAT DOCS{' '}
                  <span className="text-blue-500 text-[10px] align-top px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                    PRO
                  </span>
                </h1>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">
                  Logistics Document System
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setView('builder')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                  view === 'builder'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard size={14} /> Builder
              </button>
              <button
                onClick={() => setView('shipments')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                  view === 'shipments'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History size={14} /> Shipments
              </button>
              <button
                onClick={() => setView('chat')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                  view === 'chat'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={14} /> AI Chat
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveShipment}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-bold shadow-lg"
            >
              <CheckCircle2 size={16} /> Save
            </button>
            <button
              onClick={() => window.print()}
              className="bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-bold shadow-lg"
            >
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
        {/* Chat View */}
        {view === 'chat' && (
          <div className="max-w-4xl mx-auto print:hidden">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">TATI AI Assistant</h2>
                      <p className="text-white/70 text-xs">Powered by GPT-4o-mini</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all"
                    title="API Key Settings"
                  >
                    <Key size={16} />
                  </button>
                </div>

                {/* API Key Input */}
                {showApiKeyInput && (
                  <div className="mt-4 bg-white/10 p-3 rounded-lg">
                    <label className="text-xs font-bold text-white/70 block mb-1">OpenAI API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="flex-1 bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/50"
                      />
                      <button
                        onClick={() => setShowApiKeyInput(false)}
                        className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-xs font-bold"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1">Your key is stored locally in your browser.</p>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      ) : (
                        <FormattedMessage content={message.content} isUser={message.role === 'user'} />
                      )}
                      <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={apiKey ? "Ask me anything about shipping, products, or create a shipment..." : "Enter your API key first..."}
                    disabled={!apiKey}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatLoading || !apiKey}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {['Create shipment for 20 totes of TATI Y-07', 'What products are hazmat?', 'Explain USMCA certificate'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setChatInput(suggestion)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shipments History View */}
        {view === 'shipments' && (
          <div className="max-w-5xl mx-auto print:hidden">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History size={20} />
                  <h2 className="font-bold text-lg">Saved Shipments</h2>
                </div>
                <span className="text-slate-400 text-sm">{savedShipments.length} shipments</span>
              </div>

              {savedShipments.length === 0 ? (
                <div className="p-12 text-center">
                  <Package size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-600 mb-2">No saved shipments</h3>
                  <p className="text-slate-400 text-sm mb-4">Create a shipment in the Builder and click "Save" to store it here.</p>
                  <button
                    onClick={() => setView('builder')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all"
                  >
                    Go to Builder
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {savedShipments.map((shipment) => (
                    <div key={shipment.id} className="p-4 hover:bg-slate-50 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                              #{shipment.invoiceNumber}
                            </span>
                            <span className="text-slate-400 text-xs flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(shipment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800">{shipment.customerName}</h3>
                          <p className="text-sm text-slate-500">
                            {shipment.itemCount} item(s): {shipment.products.slice(0, 2).join(', ')}
                            {shipment.products.length > 2 && ` +${shipment.products.length - 2} more`}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs">
                            <span className="text-green-600 font-bold">
                              ${shipment.totalValue.toLocaleString()}
                            </span>
                            <span className="text-slate-400">
                              {shipment.totalGrossWeight.toLocaleString()} KG
                            </span>
                            <span className="text-slate-400">
                              Ship: {shipment.shipDate}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadShipment(shipment)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Eye size={14} /> Load
                          </button>
                          <button
                            onClick={() => handleDeleteShipment(shipment.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Builder View */}
        {view === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Configurator */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          {/* Weight Compliance */}
          <div
            className={`p-4 rounded-xl border-2 transition-all ${
              calculations.isOverweight
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3
                className={`font-black text-xs uppercase tracking-widest ${
                  calculations.isOverweight ? 'text-red-700' : 'text-green-700'
                }`}
              >
                Border Compliance
              </h3>
              {calculations.isOverweight ? (
                <AlertTriangle className="text-red-600" size={18} />
              ) : (
                <CheckCircle2 className="text-green-600" size={18} />
              )}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-black">
                  {calculations.totalGrossWeight.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-slate-500">KG</span>
                </p>
                <p className="text-[10px] font-bold opacity-60 uppercase">Total Gross Weight</p>
              </div>
              {calculations.isOverweight && (
                <p className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded uppercase">
                  Overweight
                </p>
              )}
            </div>
          </div>

          {/* Product Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-tight">
                <Package size={16} className="text-blue-600" /> Products & Load
              </h2>
              <button
                onClick={handleAddItem}
                className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-all shadow-md"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {formData.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative group"
                >
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <span className="bg-blue-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>
                      Product Name
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-xs font-bold text-slate-800 cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.5rem center',
                        backgroundSize: '1.25rem',
                        paddingRight: '2.5rem',
                      }}
                    >
                      {PRODUCT_DATABASE.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Packaging
                      </label>
                      <select
                        value={item.unitType}
                        onChange={(e) => updateItem(item.id, 'unitType', e.target.value)}
                        className="w-full bg-white border border-slate-300 p-2 rounded-lg text-xs cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1rem',
                          paddingRight: '2rem',
                        }}
                      >
                        <option value="totes">Totes</option>
                        <option value="drums">Drums</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Lot / Batch
                      </label>
                      <input
                        type="text"
                        value={item.lotNumber}
                        onChange={(e) => updateItem(item.id, 'lotNumber', e.target.value)}
                        className="w-full bg-white border p-2 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Unit Price ($)
                      </label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                        className="w-full bg-white border p-2 rounded-lg text-xs font-bold text-green-700"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Logistics */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-tight">
              <Building2 size={16} className="text-blue-600" /> Customer & Logistics
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Customer Name *"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full border p-2.5 rounded-xl text-xs"
              />
              <textarea
                placeholder="Customer Mexico Address (Final) *"
                value={formData.mexicoAddress}
                onChange={(e) => setFormData({ ...formData, mexicoAddress: e.target.value })}
                className="w-full border p-2.5 rounded-xl text-xs h-16"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Phone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="Customer Email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs"
                />
              </div>
              <textarea
                placeholder="Customer Laredo Address (Transfer Point) *"
                value={formData.laredoAddress}
                onChange={(e) => setFormData({ ...formData, laredoAddress: e.target.value })}
                className="w-full border p-2.5 rounded-xl text-xs h-16"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Laredo Contact Name"
                  value={formData.laredoContactName}
                  onChange={(e) => setFormData({ ...formData, laredoContactName: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="Laredo Contact Phone"
                  value={formData.laredoContactPhone}
                  onChange={(e) => setFormData({ ...formData, laredoContactPhone: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t pt-2 mt-2">
                <input
                  type="text"
                  placeholder="RFC (Tax ID) *"
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs font-bold"
                />
                <input
                  type="text"
                  placeholder="PO Number *"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Shipment & Carriers */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-tight">
              <Truck size={16} className="text-blue-600" /> Shipment & Compliance
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Ship Date</label>
                  <input
                    type="date"
                    value={formData.shipDate}
                    onChange={(e) => setFormData({ ...formData, shipDate: e.target.value })}
                    className="w-full border p-2.5 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                    Base Invoice #
                  </label>
                  <input
                    type="text"
                    value={formData.baseInvoice}
                    onChange={(e) => setFormData({ ...formData, baseInvoice: e.target.value })}
                    className="w-full border p-2.5 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">
                    Invoice Seq #
                  </label>
                  <input
                    type="text"
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                    className="w-full border p-2.5 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="US Carrier *"
                  value={formData.carrier}
                  onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="Customs Agent *"
                  value={formData.broker}
                  onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Load Number"
                  value={formData.loadNumber}
                  onChange={(e) => setFormData({ ...formData, loadNumber: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="ITN Number (AES)"
                  value={formData.itnNumber}
                  onChange={(e) => setFormData({ ...formData, itnNumber: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Document Preview */}
        <div className="lg:col-span-8 space-y-6">
          {/* Document Tabs */}
          <div className="flex flex-wrap gap-2 print:hidden bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
            {documentTabs
              .filter((tab) => tab.show)
              .map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDoc(doc.id)}
                  className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${
                    activeDoc === doc.id
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-transparent text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {doc.icon} {doc.label}
                </button>
              ))}
          </div>

          {/* Document Content */}
          <div className="bg-white shadow-2xl min-h-[1056px] p-8 md:p-12 border border-slate-200 text-[12px] leading-tight text-black font-serif print:p-0 print:shadow-none print:border-none relative">
            {/* Copy Button */}
            <button
              onClick={() => handleCopyDocument(activeDoc)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all text-xs font-bold print:hidden"
            >
              {copiedDoc === activeDoc ? (
                <>
                  <Check size={14} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy
                </>
              )}
            </button>

            {/* SUMMARY */}
            {activeDoc === 'summary' && (
              <div id="doc-summary" className="max-w-[800px] mx-auto space-y-6 font-sans">
                <div className="text-center border-b-2 border-black pb-4">
                  <h1 className="text-2xl font-black uppercase tracking-widest mb-1">
                    Shipment Summary
                  </h1>
                  <p className="font-bold text-slate-600">{EXPORTER_INFO.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <h3 className="font-black text-xs uppercase text-slate-400 mb-3 border-b pb-1">
                      Customer
                    </h3>
                    <p className="font-bold">{formData.customerName || '[Customer Name]'}</p>
                    <p className="text-xs text-slate-600 whitespace-pre-line">
                      {formData.mexicoAddress || '[Mexico Address]'}
                    </p>
                    <p className="font-bold mt-2 text-xs">RFC: {formData.rfc || '—'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <h3 className="font-black text-xs uppercase text-slate-400 mb-3 border-b pb-1">
                      Shipment Details
                    </h3>
                    <p>
                      <strong>Invoice:</strong> {calculations.invoiceNumber}
                    </p>
                    <p>
                      <strong>PO:</strong> {formData.poNumber || '—'}
                    </p>
                    <p>
                      <strong>Ship Date:</strong> {formatDate(formData.shipDate, 'long')}
                    </p>
                    <p>
                      <strong>Carrier:</strong> {formData.carrier}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl">
                  <h3 className="font-black text-xs uppercase text-slate-400 mb-3 border-b pb-1">
                    Products ({calculations.items.length} line items)
                  </h3>
                  <div className="space-y-2">
                    {calculations.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantity} {item.unitType} — {item.product.name}
                        </span>
                        <span className="font-bold">
                          ${item.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-center">
                    <p className="text-[10px] uppercase font-black text-blue-400">Total Net</p>
                    <p className="text-xl font-black text-blue-700">
                      {calculations.totalNetWeight.toLocaleString()} KG
                    </p>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-xl text-center">
                    <p className="text-[10px] uppercase font-black text-slate-400">Total Gross</p>
                    <p className="text-xl font-black">
                      {calculations.totalGrossWeight.toLocaleString()} KG
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl text-center">
                    <p className="text-[10px] uppercase font-black text-green-400">Total Value</p>
                    <p className="text-xl font-black text-green-700">
                      ${calculations.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-xl text-center ${calculations.hasHazmat ? 'bg-red-50' : 'bg-slate-100'}`}
                  >
                    <p
                      className={`text-[10px] uppercase font-black ${calculations.hasHazmat ? 'text-red-400' : 'text-slate-400'}`}
                    >
                      Hazmat
                    </p>
                    <p
                      className={`text-xl font-black ${calculations.hasHazmat ? 'text-red-700' : 'text-slate-500'}`}
                    >
                      {calculations.hasHazmat ? 'YES' : 'NO'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* INVOICE */}
            {activeDoc === 'invoice' && (
              <div id="doc-invoice" className="max-w-[800px] mx-auto space-y-8">
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6">
                  <div>
                    <div className="bg-slate-900 text-white px-3 py-1 inline-block font-black text-sm mb-4 tracking-widest uppercase italic">
                      Invoice
                    </div>
                    <div className="font-black text-xl text-slate-800 mb-1">
                      {EXPORTER_INFO.name.toUpperCase()}
                    </div>
                    <div className="text-[10px] space-y-0.5 font-sans">
                      <p>{EXPORTER_INFO.address}</p>
                      <p>{EXPORTER_INFO.city}</p>
                      <p>
                        TAX ID: {EXPORTER_INFO.taxId} | TEL: {EXPORTER_INFO.phone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-sans">
                    <p className="text-[10px] font-bold text-slate-400">INVOICE NUMBER</p>
                    <p className="text-2xl font-black">{calculations.invoiceNumber}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase">
                      Date of Export
                    </p>
                    <p className="text-sm font-bold">{formatDate(formData.shipDate, 'long')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 font-sans">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 mb-2 border-b border-slate-200 pb-1 tracking-widest uppercase">
                      Bill To (Mexico):
                    </h3>
                    <div className="space-y-1">
                      <p className="font-black text-sm">
                        {formData.customerName || '[Customer Name]'}
                      </p>
                      <p className="whitespace-pre-line text-xs">
                        {formData.mexicoAddress || '[Mexico Address]'}
                      </p>
                      {formData.customerPhone && <p className="text-xs">Tel: {formData.customerPhone}</p>}
                      <p className="font-bold text-xs mt-4 uppercase">RFC: {formData.rfc || '—'}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 mb-2 border-b border-slate-200 pb-1 tracking-widest uppercase">
                      Ship To (Laredo Transfer):
                    </h3>
                    <div className="space-y-1">
                      <p className="font-black text-sm">
                        {formData.customerName || '[Customer Name]'}
                      </p>
                      <p className="whitespace-pre-line text-xs">
                        {formData.laredoAddress || 'Laredo, TX 78045'}
                      </p>
                      <p className="font-bold text-xs mt-4 uppercase">
                        Attn: {formData.laredoContactName || 'Logistics Desk'}
                      </p>
                      {formData.laredoContactPhone && (
                        <p className="text-xs">Tel: {formData.laredoContactPhone}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 p-4 border border-black bg-slate-50 font-sans text-center uppercase text-[10px] font-bold">
                  <div>
                    <p className="text-slate-400 mb-1">Incoterms</p>
                    <p>CFR Laredo</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Carrier</p>
                    <p>{formData.carrier || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Broker</p>
                    <p>{formData.broker || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Load #</p>
                    <p>{formData.loadNumber || '—'}</p>
                  </div>
                </div>

                <table className="w-full border-collapse border-y-2 border-black font-sans">
                  <thead className="text-[10px] font-black text-slate-500 bg-slate-50 border-b border-black uppercase tracking-wider">
                    <tr>
                      <th className="p-3 text-left w-12">Qty</th>
                      <th className="p-3 text-left">Description of Goods</th>
                      <th className="p-3 text-right">Unit Value</th>
                      <th className="p-3 text-right">Total (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculations.items.map((item, idx) => (
                      <tr key={idx} className="h-16">
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3">
                          <p className="font-black text-sm">{item.product.name}</p>
                          <p className="text-[9px] text-slate-500 italic">
                            HTS: {item.product.htsCode} | Lot: {item.lotNumber}
                          </p>
                        </td>
                        <td className="p-3 text-right font-medium">
                          ${Number(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-black">
                          ${Number(item.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-4 font-sans">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">
                        Subtotal:
                      </span>
                      <span className="font-black">
                        ${calculations.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">
                        Sales Tax:
                      </span>
                      <span className="font-black text-slate-300">$0.00</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-900 font-black uppercase text-sm tracking-tight">
                        Total Due (USD):
                      </span>
                      <span className="text-lg font-black text-blue-600">
                        ${calculations.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-20 border-t border-slate-100 pt-8 text-center space-y-4 font-sans">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Certified correct by {PERSONNEL.generalManager} - General Manager
                  </p>
                  {formData.itnNumber && (
                    <p className="text-[10px] font-black">EEI/AES ITN: {formData.itnNumber}</p>
                  )}
                </div>
              </div>
            )}

            {/* PACKING LIST */}
            {activeDoc === 'packing' && (
              <div id="doc-packing" className="max-w-[800px] mx-auto space-y-10 font-sans">
                <div className="text-center border-b-2 border-black pb-4">
                  <h1 className="text-2xl font-black uppercase tracking-widest mb-1 italic">
                    Packing List
                  </h1>
                  <p className="font-bold text-slate-600">{EXPORTER_INFO.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="font-bold underline text-[9px] uppercase text-slate-400 tracking-tighter">
                      Shipper:
                    </p>
                    <p className="font-bold text-sm">{EXPORTER_INFO.name}</p>
                    <p className="text-xs">{EXPORTER_INFO.address}</p>
                    <p className="text-xs">{EXPORTER_INFO.city}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold underline text-[9px] uppercase text-slate-400 tracking-tighter">
                      Consignee:
                    </p>
                    <p className="font-bold text-sm">{formData.customerName}</p>
                    <p className="whitespace-pre-line text-xs">{formData.mexicoAddress}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 border-y-2 border-black divide-x divide-black py-4 text-center font-bold bg-slate-50">
                  <div className="px-2">
                    <span className="text-slate-400 text-[10px] block uppercase font-black">
                      Invoice
                    </span>{' '}
                    {calculations.invoiceNumber}
                  </div>
                  <div className="px-2">
                    <span className="text-slate-400 text-[10px] block uppercase font-black">
                      PO Number
                    </span>{' '}
                    {formData.poNumber || '—'}
                  </div>
                  <div className="px-2">
                    <span className="text-slate-400 text-[10px] block uppercase font-black">
                      Ship Date
                    </span>{' '}
                    {formData.shipDate}
                  </div>
                </div>

                <table className="w-full border-collapse mt-4">
                  <thead className="bg-slate-900 text-white uppercase text-[10px]">
                    <tr>
                      <th className="p-3 text-left">Product / Description</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Net (KG)</th>
                      <th className="p-3">Gross (KG)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {calculations.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <p className="font-bold text-sm">{item.product.name}</p>
                          <p className="text-[10px] text-slate-500 italic">Lot: {item.lotNumber}</p>
                        </td>
                        <td className="p-3 text-center">
                          {item.quantity} {item.unitType}
                        </td>
                        <td className="p-3 text-center">{item.netWeight.toLocaleString()}</td>
                        <td className="p-3 text-center">{item.grossWeight.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="bg-slate-900 text-white p-6 rounded-2xl grid grid-cols-3 gap-4 text-center mt-12 shadow-lg">
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-50 mb-1">Total Net</p>
                    <p className="text-2xl font-black">
                      {calculations.totalNetWeight.toLocaleString()}{' '}
                      <span className="text-xs font-normal">KG</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-50 mb-1">Total Tare</p>
                    <p className="text-2xl font-black">
                      {calculations.totalTareWeight.toLocaleString()}{' '}
                      <span className="text-xs font-normal">KG</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black opacity-50 mb-1">Total Gross</p>
                    <p className="text-2xl font-black text-blue-400">
                      {calculations.totalGrossWeight.toLocaleString()}{' '}
                      <span className="text-xs font-normal">KG</span>
                    </p>
                  </div>
                </div>

                <p className="text-center text-[10px] text-slate-400 font-sans italic mt-12 uppercase font-black tracking-widest">
                  Total Pallets: {calculations.totalPallets} | Carrier: {formData.carrier} | Load:{' '}
                  {formData.loadNumber}
                </p>
              </div>
            )}

            {/* USMCA */}
            {activeDoc === 'usmca' && (
              <div
                id="doc-usmca"
                className="max-w-[850px] mx-auto text-[9px] uppercase border-[0.5px] border-black font-sans"
              >
                <div className="bg-black text-white p-3 text-center font-black text-sm tracking-[0.2em]">
                  USMCA CERTIFICATE OF ORIGIN
                </div>

                <div className="grid grid-cols-2 divide-x divide-y divide-black border-b border-black">
                  <div className="p-3 space-y-1">
                    <p className="font-black text-slate-500 underline mb-1">
                      1. Certifier Name and Address:
                    </p>
                    <p className="font-black text-[11px]">{EXPORTER_INFO.name}</p>
                    <p>{EXPORTER_INFO.address}</p>
                    <p>{EXPORTER_INFO.city}</p>
                    <p>TAX ID: {EXPORTER_INFO.taxId}</p>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-black text-slate-500 underline mb-1">
                      2. Exporter Name and Address:
                    </p>
                    <p className="font-black text-[11px]">{EXPORTER_INFO.name}</p>
                    <p>{EXPORTER_INFO.address}</p>
                    <p>{EXPORTER_INFO.city}</p>
                    <p>TAX ID: {EXPORTER_INFO.taxId}</p>
                  </div>
                  <div className="p-3 space-y-1 border-t border-black">
                    <p className="font-black text-slate-500 underline mb-1">
                      3. Producer Name and Address:
                    </p>
                    <p className="font-black text-[11px]">{EXPORTER_INFO.name}</p>
                    <p>{EXPORTER_INFO.address}</p>
                    <p>{EXPORTER_INFO.city}</p>
                  </div>
                  <div className="p-3 space-y-1 border-t border-black">
                    <p className="font-black text-slate-500 underline mb-1">
                      4. Importer Name and Address:
                    </p>
                    <p className="font-black text-[11px]">{formData.customerName || '—'}</p>
                    <p className="normal-case">{formData.mexicoAddress || '—'}</p>
                    <p className="font-bold">RFC: {formData.rfc || '—'}</p>
                  </div>
                </div>

                <table className="w-full text-center border-b border-black border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="divide-x divide-black border-b border-black h-12">
                      <th className="p-1 w-2/6">5. Description of Goods</th>
                      <th className="p-1 w-1/6">6. HS Classification</th>
                      <th className="p-1 w-1/12">7. Criterion</th>
                      <th className="p-1 w-1/12">8. Origin</th>
                      <th className="p-1 w-2/6">9. Blanket Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.items.map((item, idx) => (
                      <tr key={idx} className="divide-x divide-black h-16">
                        <td className="p-2 font-black">
                          {item.product.name} (CHEMICAL ADDITIVE)
                        </td>
                        <td className="p-2">{item.product.htsCode}</td>
                        <td className="p-2">A</td>
                        <td className="p-2">USA</td>
                        <td className="p-2">
                          01/01/{currentYear} TO 12/31/{currentYear}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-6 space-y-6">
                  <p className="text-[8px] leading-relaxed normal-case italic text-slate-500">
                    I certify that the goods described in this document qualify as originating and
                    the information contained in this document is true and accurate. I assume
                    responsibility for proving such representations and agree to maintain and present
                    upon request or to make available during a verification visit, documentation
                    necessary to support this certification.
                  </p>
                  <div className="grid grid-cols-2 gap-20">
                    <div className="border-t-2 border-black pt-2">
                      <p className="font-black">Certifier's Signature: _______________________</p>
                      <p className="mt-2 font-black text-[10px]">
                        {PERSONNEL.generalManager} - GENERAL MANAGER
                      </p>
                    </div>
                    <div className="pt-2 text-right">
                      <p className="font-black">Date: {formatDate(formData.shipDate, 'long')}</p>
                      <p className="text-[10px] font-black text-slate-400">
                        TEXAS AMERICAN TRADE, INC.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BOL */}
            {activeDoc === 'bol' && (
              <div id="doc-bol" className="max-w-[800px] mx-auto text-[10px] font-sans">
                <div className="flex justify-between border-b-2 border-black pb-2 mb-4 italic">
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight">
                      Straight Bill of Lading
                    </h1>
                    <p className="text-[8px] font-bold not-italic">ORIGINAL - NOT NEGOTIABLE</p>
                  </div>
                  <div className="text-right not-italic">
                    <p className="font-black text-sm">BOL #: {calculations.invoiceNumber}</p>
                    <p className="font-bold text-slate-500 uppercase tracking-tighter">
                      Date: {formData.shipDate}
                    </p>
                    {formData.itnNumber && (
                      <p className="text-[9px] font-bold">ITN: {formData.itnNumber}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-2 border-black mb-6">
                  <div className="p-3 border-r-2 border-black bg-slate-50/50">
                    <p className="font-black text-[9px] text-slate-400 mb-1 border-b uppercase">
                      From (Shipper):
                    </p>
                    <p className="font-black text-sm italic">{EXPORTER_INFO.name}</p>
                    <p>{EXPORTER_INFO.address}</p>
                    <p>{EXPORTER_INFO.city}</p>
                    <p className="mt-2">Contact: {PERSONNEL.shipperContact}</p>
                  </div>
                  <div className="p-3 bg-slate-50/50">
                    <p className="font-black text-[9px] text-slate-400 mb-1 border-b uppercase">
                      Consigned To (Laredo Transfer):
                    </p>
                    <p className="font-black text-sm italic">{formData.customerName || '—'}</p>
                    <p className="whitespace-pre-line">
                      {formData.laredoAddress || 'Laredo, TX 78045'}
                    </p>
                    <p className="mt-2 font-bold uppercase text-[9px]">
                      Attn: {formData.laredoContactName || 'Receiving Dept'}
                    </p>
                    {formData.laredoContactPhone && (
                      <p className="text-[9px]">Tel: {formData.laredoContactPhone}</p>
                    )}
                  </div>
                </div>

                {calculations.hasHazmat && (
                  <div className="bg-red-50 border-2 border-red-600 p-4 mb-6 rounded-xl flex items-center gap-6">
                    <AlertTriangle size={32} className="text-red-600 shrink-0" />
                    <div>
                      <p className="text-red-800 font-black uppercase text-xs">
                        Hazardous Materials Incident
                      </p>
                      <p className="text-[10px] font-bold">
                        CHEMTREC 24/7 (USA/Canada): 1-800-424-9300
                      </p>
                      <p className="text-[9px] font-bold opacity-60 uppercase">
                        CCN: 792659 | International: +1 703-527-3887
                      </p>
                    </div>
                  </div>
                )}

                <table className="w-full border-collapse border-2 border-black text-center mb-10">
                  <thead className="bg-slate-100 font-black text-[9px] uppercase border-b-2 border-black">
                    <tr className="divide-x-2 divide-black">
                      <th className="p-2 w-12">Qty</th>
                      <th className="p-2 text-left px-4">
                        Kind of Package / Description of Articles
                      </th>
                      <th className="p-2 w-24">Weight (KG)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.items.map((item, idx) => {
                      const isHazmat = item.product.unNumber !== 'Not regulated';
                      const properShippingName = PROPER_SHIPPING_NAMES[item.product.unNumber];
                      return (
                        <tr
                          key={idx}
                          className="divide-x-2 divide-black border-b border-slate-200 align-top"
                        >
                          <td className="p-3 font-bold">{item.quantity}</td>
                          <td className="p-3 text-left px-4">
                            {isHazmat && (
                              <span className="text-red-600 font-black mr-2">[HM]</span>
                            )}
                            <span className="font-black uppercase">{item.product.name}</span>
                            <p className="text-[9px] text-slate-600 mt-1 italic leading-tight">
                              {isHazmat
                                ? `${item.product.unNumber}, ${properShippingName?.dot || 'N/A'}, ${item.product.hazardClass}, ${item.product.packingGroup}`
                                : 'Petroleum Chemical Additives, Not Regulated'}
                            </p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                              Lot: {item.lotNumber} | Density: {item.product.density} S.G.
                            </p>
                          </td>
                          <td className="p-3 font-black text-right">
                            {item.grossWeight.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-sm">
                      <td colSpan={2} className="p-3 text-right uppercase tracking-widest italic">
                        Shipment Gross Weight (KG)
                      </td>
                      <td className="p-3 text-right text-blue-400">
                        {calculations.totalGrossWeight.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="grid grid-cols-2 gap-12 text-[8px] leading-relaxed uppercase font-bold text-slate-400 border-t-2 border-black pt-4">
                  <div className="space-y-4 italic">
                    <p>
                      I hereby certify that the above named materials are properly classified,
                      described, packaged, marked and labeled according to DOT regulations.
                    </p>
                    <div className="pt-2 border-b-2 border-black text-black not-italic font-black pb-1">
                      Shipper Sign: {PERSONNEL.shipperContact} (for TAT)
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p>
                      Carrier: {formData.carrier} | Load: {formData.loadNumber}
                    </p>
                    <div className="pt-2 border-b-2 border-black pb-1 italic">
                      Driver Sign: ___________________________
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COQ (Spanish) */}
            {activeDoc === 'coq' && (
              <div id="doc-coq" className="max-w-[700px] mx-auto font-sans space-y-8">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500">
                    6260 Westpark Drive, Suite 300N
                    <br />
                    Houston, Texas – USA 77057
                  </p>
                  <h1 className="text-2xl font-black mt-4 tracking-wide">Certificado de Calidad</h1>
                </div>

                {calculations.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-xl p-6 space-y-4 bg-slate-50"
                  >
                    <h2 className="text-lg font-black text-blue-700">{item.product.name}</h2>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold">
                          Fabricante
                        </p>
                        <p className="font-bold">{EXPORTER_INFO.name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold">
                          Nombre de producto
                        </p>
                        <p className="font-bold">{item.product.name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold">
                          Fecha de produccion
                        </p>
                        <p className="font-bold">{formatDate(formData.shipDate, 'spanish')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold">
                          Numero de lote
                        </p>
                        <p className="font-bold">{item.lotNumber}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold">Lab ID No.</p>
                        <p className="font-bold">{labId}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-black text-sm uppercase text-slate-600 mb-2">
                        Resultados del laboratorio
                      </h3>
                      <table className="w-full text-[10px] border border-slate-300">
                        <thead className="bg-slate-200">
                          <tr>
                            <th className="p-2 text-left">Prueba</th>
                            <th className="p-2">Metodo</th>
                            <th className="p-2">Minimo</th>
                            <th className="p-2">Maximo</th>
                            <th className="p-2">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t">
                            <td className="p-2">Apariencia, Color</td>
                            <td className="p-2 text-center">ASTM D1544</td>
                            <td className="p-2 text-center">—</td>
                            <td className="p-2 text-center">—</td>
                            <td className="p-2 text-center font-bold">Amber</td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">pH</td>
                            <td className="p-2 text-center">ASTM E70</td>
                            <td className="p-2 text-center">—</td>
                            <td className="p-2 text-center">
                              {item.product.maxSG.toFixed(1).replace('.', ',')}
                            </td>
                            <td className="p-2 text-center font-bold">
                              {item.product.pH.toFixed(1).replace('.', ',')}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Gravedad especifica @ 72F</td>
                            <td className="p-2 text-center">ASTM D891B</td>
                            <td className="p-2 text-center">
                              {item.product.minSG.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-2 text-center">
                              {item.product.maxSG.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-2 text-center font-bold">
                              {item.product.density.toFixed(2).replace('.', ',')}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-2">Presencia de Silicio Organico</td>
                            <td className="p-2 text-center">ID-142-7500</td>
                            <td className="p-2 text-center">—</td>
                            <td className="p-2 text-center">0,00</td>
                            <td className="p-2 text-center font-bold">0,00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-6 space-y-4">
                  <p className="text-[10px] italic text-slate-600">
                    Texas American Trade, Inc. certifica que el producto cumple o excede las
                    especificaciones establecidas en este certificado de calidad y analisis.
                  </p>
                  <div className="grid grid-cols-2 gap-8 text-sm">
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase font-bold">Tecnico</p>
                      <p className="font-bold border-b border-black pb-1">
                        {PERSONNEL.qaTechnician}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase font-bold">Fecha</p>
                      <p className="font-bold border-b border-black pb-1">
                        {formatDate(formData.shipDate, 'mmddyyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HAZMAT */}
            {activeDoc === 'hazmat' && calculations.hasHazmat && (
              <div id="doc-hazmat" className="max-w-[700px] mx-auto font-sans space-y-6">
                <div className="text-center border-b-2 border-red-600 pb-4">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <AlertTriangle size={32} className="text-red-600" />
                    <h1 className="text-2xl font-black uppercase text-red-700">
                      Hazardous Materials Information
                    </h1>
                    <AlertTriangle size={32} className="text-red-600" />
                  </div>
                </div>

                <div className="bg-red-50 border-2 border-red-300 p-4 rounded-xl">
                  <h3 className="font-black text-red-700 uppercase text-sm mb-2">
                    24-Hour Emergency Contact
                  </h3>
                  <p className="text-lg font-black">CHEMTREC: 1-800-424-9300</p>
                  <p className="text-sm">CCN: 792659</p>
                  <p className="text-sm">International: +1 703-527-3887</p>
                </div>

                {calculations.items
                  .filter((item) => item.product.unNumber !== 'Not regulated')
                  .map((item, idx) => {
                    const properShippingName = PROPER_SHIPPING_NAMES[item.product.unNumber];
                    const ergNumber = ERG_NUMBERS[item.product.unNumber];
                    return (
                      <div
                        key={idx}
                        className="border border-slate-200 rounded-xl p-5 space-y-4 bg-white"
                      >
                        <h2 className="text-lg font-black text-slate-800 border-b pb-2">
                          {item.product.name}
                        </h2>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">
                              UN Number
                            </p>
                            <p className="font-black text-lg text-red-600">
                              {item.product.unNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">
                              Hazard Class
                            </p>
                            <p className="font-black text-lg">{item.product.hazardClass}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">
                              Packing Group
                            </p>
                            <p className="font-bold">{item.product.packingGroup}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase font-bold">
                              ERG Guide #
                            </p>
                            <p className="font-bold">{ergNumber || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-slate-500 text-[10px] uppercase font-bold">
                            DOT Proper Shipping Name
                          </p>
                          <p className="font-bold">{properShippingName?.dot || 'N/A'}</p>
                        </div>

                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <p className="text-yellow-700 text-[10px] uppercase font-bold">
                            Spanish Shipping Name (NOM-002-SCT)
                          </p>
                          <p className="font-bold text-yellow-800">
                            {properShippingName?.nom || 'N/A'}
                          </p>
                        </div>

                        <div className="text-sm">
                          <p className="text-slate-500 text-[10px] uppercase font-bold">
                            Quantity
                          </p>
                          <p className="font-bold">
                            {item.quantity} {item.unitType} ({item.netWeight.toLocaleString()} KG
                            net)
                          </p>
                        </div>
                      </div>
                    );
                  })}

                <div className="bg-slate-100 p-4 rounded-xl">
                  <h3 className="font-black text-sm uppercase text-slate-700 mb-2">
                    Mexican Requirements (NOM-002-SCT)
                  </h3>
                  <ul className="text-sm space-y-1 list-disc list-inside text-slate-600">
                    <li>All hazmat information must appear in SPANISH on Mexican documents</li>
                    <li>Spanish SDS (Hoja de Datos de Seguridad) required</li>
                    <li>NOM-002-SCT compliant labeling required</li>
                    <li>Mexican emergency contact number must be provided</li>
                  </ul>
                </div>
              </div>
            )}

            {/* REMINDERS */}
            {activeDoc === 'reminders' && (
              <div id="doc-reminders" className="max-w-[800px] mx-auto font-sans space-y-6">
                <div className="text-center border-b-2 border-amber-500 pb-4">
                  <h1 className="text-2xl font-black uppercase text-amber-700">
                    Critical Next Steps — Laredo Border Workflow
                  </h1>
                </div>

                {calculations.items.some((item) => item.product.htsCode === '3811.90.99') && (
                  <div
                    className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-xl"
                    role="alert"
                  >
                    <p className="font-bold">HTS Code Verification Needed</p>
                    <p className="text-sm">
                      Some products use the default HTS code (3811.90.99). Please verify the correct
                      HTS code with your customs broker before finalizing documents.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h4 className="font-black text-slate-800 mb-3 uppercase text-sm border-b pb-2">
                      Before Shipment to Laredo
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>Verify customer's RFC number is correct</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>File EEI/AES to get ITN number</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={formData.itnNumber ? 'text-green-600' : 'text-slate-400'}>
                          {formData.itnNumber ? '☑' : '☐'}
                        </span>
                        <span>Add ITN number to Bill of Lading</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>Confirm US carrier to Laredo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>Confirm customs broker has all documents in advance</span>
                      </li>
                      {calculations.hasHazmat && (
                        <li className="flex items-start gap-2 text-red-600">
                          <span>☐</span>
                          <span>Verify Spanish SDS is with shipment</span>
                        </li>
                      )}
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>Verify Certificate of Quality (Spanish) is with shipment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>Confirm pricing on Commercial Invoice</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>Get authorized signature on Certificate of Origin</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h4 className="font-black text-slate-800 mb-3 uppercase text-sm border-b pb-2">
                      At Laredo Border (Transfer Point)
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>
                          Weight accuracy is CRITICAL - Texas vs Mexico truck weight limits differ
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>All documents must be ready for border inspection</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>
                          Commercial Invoice will be scrutinized - ensure 100% accuracy
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>Mexican carrier must have Carta Porte ready</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-slate-400">☐</span>
                        <span>
                          Customs broker processes Numero de Pedimento and Clave Trafico
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h4 className="font-black text-slate-800 mb-3 uppercase text-sm border-b pb-2">
                    Document Accuracy (Gets Scrutinized at Border)
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">☐</span>
                      <span>
                        Customer name/address/RFC EXACTLY matches across all documents
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">☐</span>
                      <span>Weights match between Invoice, Packing List, and BOL</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">☐</span>
                      <span>Product description and HTS code consistent across all forms</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">☐</span>
                      <span>Lot/Batch numbers match on all documents</span>
                    </li>
                    {calculations.hasHazmat && (
                      <li className="flex items-start gap-2 text-red-600">
                        <span>☐</span>
                        <span>Hazmat info matches EXACTLY on all documents</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <h4 className="font-black text-green-800 mb-3 uppercase text-sm">
                    Labor Cost Savings
                  </h4>
                  <ul className="space-y-1 text-sm text-green-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>
                        This system eliminates hours of manual document preparation per shipment
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Reduces errors that cause costly border delays</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Ensures timing requirements are met for faster processing</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
        )}
      </main>

      {/* Floating UI */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 print:hidden">
        <div className="flex flex-col gap-2 items-end">
          <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-slate-200 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
            <Info size={14} className="text-blue-500" />
            Laredo Transfer Required
          </div>
          <button className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all group relative">
            <FileDown size={24} />
            <span className="absolute right-full mr-3 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black tracking-tighter shadow-lg">
              Export Packet
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .p-12 { padding: 0 !important; }
          header { display: none !important; }
          main { display: block !important; margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          .lg\\:col-span-8 { width: 100% !important; }
          .min-h-\\[1056px\\] { box-shadow: none !important; border: none !important; padding: 0 !important; }
          .bg-slate-50 { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-slate-900 { background-color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .text-blue-400 { color: #60a5fa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-black { background-color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .text-white { color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default App;
