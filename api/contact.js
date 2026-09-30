export default async function handler(req, res) {
  const logs = [];

  logs.push('START: Contact form request received');
  logs.push(`Method: ${req.method}`);
  logs.push(`Body: ${JSON.stringify(req.body)}`);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée', logs });
  }

  try {
    logs.push('POST method OK');

    const { 'fi-sender-firstName': prenom, 'fi-sender-lastName': nom, 'fi-sender-phone': telephone, 'fi-sender-email': email, 'fi-select-type_travaux': typeTravaux, 'fi-text-description': description } = req.body;

    logs.push(`Extracted: prenom=${prenom}, nom=${nom}, phone=${telephone}, email=${email}, type=${typeTravaux}`);

    // Validation basique
    if (!prenom || !nom || !telephone || !typeTravaux) {
      logs.push('ERROR: Validation failed - missing required fields');
      return res.status(400).json({ error: 'Champs obligatoires manquants', logs });
    }

    logs.push('Validation OK');

    const resendApiKey = process.env.RESEND_API_KEY;
    logs.push(`Resend API Key exists: ${!!resendApiKey}`);
    logs.push(`API Key first 10 chars: ${resendApiKey ? resendApiKey.substring(0, 10) : 'NONE'}`);

    if (!resendApiKey) {
      logs.push('ERROR: RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Service indisponible - API key manquante', logs });
    }

    // Construire le HTML de l'email
    const htmlContent = `
      <h2>Nouvelle demande de devis</h2>
      <p><strong>Prénom:</strong> ${prenom}</p>
      <p><strong>Nom:</strong> ${nom}</p>
      <p><strong>Téléphone:</strong> ${telephone}</p>
      ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
      <p><strong>Type de travaux:</strong> ${typeTravaux}</p>
      ${description ? `<p><strong>Description:</strong></p><p>${description.replace(/\n/g, '<br>')}</p>` : ''}
    `;

    logs.push('Building HTML content...');

    // Envoyer via Resend API
    logs.push('Preparing Resend payload...');
    const resendPayload = {
      from: 'onboarding@resend.dev',
      to: 'delivered@resend.dev',
      subject: `[TEST] Nouvelle demande de devis - ${nom} ${prenom}`,
      html: htmlContent,
    };

    logs.push(`Resend payload ready: ${JSON.stringify(resendPayload)}`);
    logs.push('Calling Resend API...');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    logs.push(`Resend response status: ${resendResponse.status}`);
    logs.push(`Resend response ok: ${resendResponse.ok}`);

    const responseText = await resendResponse.text();
    logs.push(`Resend response body: ${responseText}`);

    if (!resendResponse.ok) {
      logs.push(`ERROR: Resend error (status ${resendResponse.status}): ${responseText}`);
      return res.status(500).json({ error: 'Erreur Resend: ' + responseText, logs });
    }

    const resendResult = JSON.parse(responseText);
    logs.push(`Resend success: ${JSON.stringify(resendResult)}`);

    logs.push('SUCCESS: Email sent');
    return res.status(200).json({ success: true, message: 'Email envoyé avec succès', logs });
  } catch (error) {
    logs.push(`CATCH ERROR: ${error.message}`);
    logs.push(`Stack: ${error.stack}`);
    return res.status(500).json({ error: 'Erreur serveur: ' + error.message, logs });
  }
}
