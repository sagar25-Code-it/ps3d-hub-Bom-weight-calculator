// Vercel Serverless Function — saves user data to Vercel KV
// Run: vercel kv create ps3d-users  (then copy the URL to env)
// Add KV_URL to Vercel environment variables

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { name, email, mobile, source } = req.body;

    // Validate
    if (!name || !email || !mobile) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if KV is configured
    const kvUrl = process.env.KV_URL;
    const kvToken = process.env.KV_TOKEN;

    if (!kvUrl || !kvToken) {
      // If KV not configured, log the data and return success
      // (useful for development / graceful degradation)
      console.log('[USER DATA]', { name, email, mobile, source, timestamp: new Date().toISOString() });
      return res.status(200).json({
        success: true,
        message: 'Data logged (KV not configured)',
        data: { name, email, mobile }
      });
    }

    // Store in Vercel KV
    const userRecord = {
      id: Date.now().toString(),
      name,
      email,
      mobile,
      source: source || 'ps3d-hub',
      createdAt: new Date().toISOString()
    };

    // Use KV REST API
    const response = await fetch(`${kvUrl}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kvToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userRecord)
    });

    if (!response.ok) {
      throw new Error(`KV storage failed: ${response.status}`);
    }

    return res.status(200).json({
      success: true,
      message: 'User data saved successfully',
      data: { name, email, mobile }
    });

  } catch (error) {
    console.error('[SAVE-USER ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save user data',
      error: error.message
    });
  }
}
