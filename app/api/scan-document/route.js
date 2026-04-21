export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Determine media type — Claude Vision supports jpeg, png, gif, webp, pdf
    const supportedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    if (!supportedTypes.includes(mimeType)) {
      return Response.json(
        { error: 'Unsupported file type. Please upload a JPG, PNG, or PDF.' },
        { status: 400 }
      );
    }

    const isPdf = mimeType === 'application/pdf';

    const messageContent = [
      {
        type: isPdf ? 'document' : 'image',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: base64,
        },
      },
      {
        type: 'text',
        text: `You are scanning a vessel registration or documentation document. Extract all relevant vessel identity information and return it as a JSON object.

Extract these fields if present (use exact key names):
- vessel_name: Official vessel name
- hin: Hull Identification Number (HIN) — format like US-ABC12345D606
- uscg_doc: USCG Documentation Number (federal doc number, 7 digits)
- state_reg: State registration number (like WA1234AB)
- mmsi: MMSI number (9 digits)
- call_sign: Radio call sign
- flag: Flag state / country
- home_port: Hailing port
- make: Builder / manufacturer
- model: Vessel model name
- year: Year built
- loa: Length overall in feet (number only)
- beam: Beam in feet (number only)  
- draft: Draft in feet (number only)
- owner_name: Registered owner name
- insurance_carrier: Insurance company name
- policy_no: Insurance policy number
- policy_exp: Policy expiry date in YYYY-MM-DD format

Return ONLY a valid JSON object with the fields you found. Omit fields not present in the document. Do not include any explanation or markdown — just the raw JSON object.

Example: {"vessel_name":"IRENE","hin":"US-ABC12345D606","uscg_doc":"1234567","home_port":"Seattle, WA"}`,
      },
    ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: messageContent }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(function () {
        return {};
      });
      return Response.json({ error: err.error?.message || 'Vision API error' }, { status: 500 });
    }

    const data = await res.json();
    const text = (data.content || [])
      .map(function (b) {
        return b.text || '';
      })
      .join('')
      .trim();

    // Strip any markdown code fences if present
    const clean = text
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    let extracted;
    try {
      extracted = JSON.parse(clean);
    } catch (e) {
      return Response.json(
        { error: 'Could not parse document. Please try a clearer photo.' },
        { status: 422 }
      );
    }

    // Validate it's an object with at least one field
    if (typeof extracted !== 'object' || Object.keys(extracted).length === 0) {
      return Response.json({ error: 'No vessel information found in document.' }, { status: 422 });
    }

    return Response.json({ fields: extracted });
  } catch (e) {
    console.error('Scan document error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
