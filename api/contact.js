export default async function handler(req, res) {
  console.log('[API] Contact form request received');
  console.log('[API] Method:', req.method);
  console.log('[API] Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { 'fi-sender-firstName': prenom, 'fi-sender-lastName': nom, 'fi-sender-phone': telephone, 'fi-sender-email': email, 'fi-select-type_travaux': typeTravaux, 'fi-text-description': description } = req.body;

    console.log('[API] Extracted fields:', { prenom, nom, telephone, email, typeTravaux });

    // Validation basique
    if (!prenom || !nom || !telephone || !typeTravaux) {
      console.error('[API] Validation failed - missing required fields');
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    console.log('[API] Resend API Key exists:', !!resendApiKey);

    if (!resendApiKey) {
      console.error('[API] RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Service indisponible - API key manquante' });
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

    // Envoyer via Resend API
    console.log('[API] Sending email via Resend...');
    const resendPayload = {
      from: 'noreply@issam-peinture.fr',
      to: 'contact@solveria.fr',
      subject: `Nouvelle demande de devis - ${nom} ${prenom}`,
      html: htmlContent,
    };

    console.log('[API] Resend payload:', JSON.stringify(resendPayload, null, 2));

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    console.log('[API] Resend response status:', resendResponse.status);

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('[API] Resend error response:', errorData);
      return res.status(500).json({ error: 'Erreur Resend: ' + errorData });
    }

    const resendResult = await resendResponse.json();
    console.log('[API] Resend success:', resendResult);

    return res.status(200).json({ success: true, message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error('[API] Error in contact form:', error);
    return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  }
}
