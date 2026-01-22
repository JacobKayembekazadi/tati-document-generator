// Vercel Serverless Function for OpenAI Chat
// This keeps the API key secure on the server side

import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Product database for context
const PRODUCTS = [
  { id: 'P01', name: 'TATI ANTIFOAM-07', unNumber: 'Not regulated', hazardClass: '-', density: 1.01 },
  { id: 'P02', name: 'TATI CLEAN 100', unNumber: 'Not regulated', hazardClass: '-', density: 1.01 },
  { id: 'P03', name: 'TATI CYDE 900', unNumber: 'Not regulated', hazardClass: '-', density: 1.02 },
  { id: 'P04', name: 'TATI FLOC-07', unNumber: 'Not regulated', hazardClass: '-', density: 1.01 },
  { id: 'P05', name: 'TATI FOAM 311', unNumber: 'Not regulated', hazardClass: '-', density: 1.07 },
  { id: 'P06', name: 'TATI SCALE 327', unNumber: 'Not regulated', hazardClass: '-', density: 1.04 },
  { id: 'P07', name: 'TATI NOL 99', unNumber: 'UN1219', hazardClass: '3', density: 0.785 },
  { id: 'P08', name: 'TATI FIN 91', unNumber: 'UN1268', hazardClass: '3', density: 0.92 },
  { id: 'P09', name: 'TATI REZ 100', unNumber: 'UN1299', hazardClass: '3', density: 0.865 },
  { id: 'P10', name: 'TATI CLR-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', density: 1.01 },
  { id: 'P11', name: 'TATI IH-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', density: 0.83 },
  { id: 'P12', name: 'TATI FLOW-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', density: 1.02 },
  { id: 'P13', name: 'TATI Y-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', density: 0.86 },
  { id: 'P14', name: 'TATI EB-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', density: 0.9 },
  { id: 'P15', name: 'TATI AYA-07', unNumber: 'NA1993', hazardClass: '3', density: 0.861 },
  { id: 'P16', name: 'TATI HIB-77', unNumber: 'NA1993', hazardClass: '3', density: 0.92 },
  { id: 'P17', name: 'TATI HIB-07', unNumber: 'NA1993', hazardClass: '3', density: 0.87 },
  { id: 'P18', name: 'TATI SCORE-07', unNumber: 'NA1993', hazardClass: '3', density: 0.99 },
  { id: 'P19', name: 'TATI THIN 80', unNumber: 'NA1993', hazardClass: '3', density: 0.861 },
  { id: 'P20', name: 'TATI ECO H2S SECUESTRANTE', unNumber: 'NA1993', hazardClass: '3', density: 1.02 },
  { id: 'P21', name: 'TATI SECUESTRANTE H2S', unNumber: 'UN2735', hazardClass: '8', density: 1.12 },
  { id: 'P22', name: 'TATI CHEM 153', unNumber: 'UN2924', hazardClass: '8', density: 1.01 },
];

const SYSTEM_PROMPT = `You are a helpful assistant for Texas American Trade, Inc. (TATI), a company that exports petroleum chemical additives from Houston, TX to Mexico via Laredo.

COMPANY INFO:
- Name: Texas American Trade, Inc.
- Address: 5075 Westheimer, Suite 799 W, Houston, Texas 77056
- Phone: +1 (832) 238-1103
- Tax ID: 74-3016496
- Contact: Hernany Martinez (General Manager)

PRODUCTS DATABASE (22 products):
${PRODUCTS.map(p => `- ${p.name} (ID: ${p.id}): UN# ${p.unNumber}, Hazard Class: ${p.hazardClass}, Density: ${p.density}`).join('\n')}

PACKAGING:
- TOTES: 1000L IBC containers, ~60kg tare weight, 1 per pallet
- DRUMS: 208L steel drums, ~25kg tare weight, 4 per pallet
- Max load weight: 21,000 KG gross

DOCUMENTS GENERATED:
1. Commercial Invoice - billing document with product details
2. Packing List - physical contents for customs
3. USMCA Certificate - origin certificate for duty-free trade
4. Bill of Lading - carrier contract and receipt
5. Certificate of Quality (Spanish) - quality certification
6. Hazmat Declaration - required for UN-numbered products
7. Reminders Checklist - pre-shipment verification

HAZMAT RULES:
- Products with UN numbers require hazmat documentation
- UN1992, UN1219, UN1268, UN1299 = Flammable (Class 3)
- UN2735 = Corrosive (Class 8)
- UN2924 = Flammable + Corrosive (Class 8)

## SPECIAL CAPABILITIES

### 1. CREATE SHIPMENT
When users ask to CREATE a shipment, respond with:
\`\`\`json
{
  "action": "create_shipment",
  "items": [{"productId": "P13", "quantity": 20, "unitType": "totes", "unitPrice": 2450}],
  "customerName": "Customer Name",
  "mexicoAddress": "Address in Mexico",
  "rfc": "RFC123456ABC"
}
\`\`\`

### 2. UPDATE CUSTOMER
When users ask to UPDATE customer info:
\`\`\`json
{
  "action": "update_customer",
  "customerName": "New Name",
  "mexicoAddress": "New Address",
  "rfc": "RFC123"
}
\`\`\`

### 3. GENERATE CHARTS
When users ask for visualizations, charts, or graphs, respond with a chart block. Use this format:
\`\`\`chart
{
  "type": "bar",
  "title": "Chart Title",
  "data": [
    {"name": "Item A", "value": 100},
    {"name": "Item B", "value": 200}
  ]
}
\`\`\`

Chart types available:
- "bar" - for comparisons (products, weights, values)
- "line" - for trends over time
- "pie" - for proportions/percentages

Example chart requests and responses:
- "Show product densities" → bar chart with product names and density values
- "Compare hazmat vs non-hazmat products" → pie chart
- "Show weight distribution" → bar chart

Always include meaningful titles. Use the data property with "name" and "value" keys.

### 4. GENERATE TABLES
Use markdown tables for structured data:
| Product | UN Number | Hazard Class |
|---------|-----------|--------------|
| TATI Y-07 | UN1992 | 3 (6.1) |

Be helpful, concise, and knowledgeable about international shipping, hazmat regulations, and Mexican customs requirements.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const { messages, shipmentContext } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Build context-aware system prompt
    let contextPrompt = SYSTEM_PROMPT;
    if (shipmentContext) {
      contextPrompt += `\n\nCURRENT SHIPMENT INFO:
- Invoice: ${shipmentContext.invoiceNumber || 'Not set'}
- Customer: ${shipmentContext.customerName || 'Not set'}
- Ship Date: ${shipmentContext.shipDate || 'Not set'}
- Products: ${shipmentContext.products || 'None'}
- Total Value: $${shipmentContext.totalValue?.toLocaleString() || '0'}
- Total Weight: ${shipmentContext.totalGrossWeight?.toLocaleString() || '0'} KG
- Has Hazmat: ${shipmentContext.hasHazmat ? 'Yes' : 'No'}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: contextPrompt },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.error?.message || 'OpenAI API error' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'Sorry, I could not process that request.';

    return res.status(200).json({ content });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
