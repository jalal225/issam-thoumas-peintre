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

    const brevoApiKey = process.env.BREVO_API_KEY;
    console.log('[API] Brevo API Key exists:', !!brevoApiKey);

    if (!brevoApiKey) {
      console.error('[API] BREVO_API_KEY not configured');
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

    const textContent = `
Nouvelle demande de devis

Prénom: ${prenom}
Nom: ${nom}
Téléphone: ${telephone}
${email ? `Email: ${email}` : ''}
Type de travaux: ${typeTravaux}
${description ? `Description:\n${description}` : ''}
    `;

    // Envoyer via Brevo API
    console.log('[API] Sending email via Brevo...');
    const brevoPayload = {
      sender: {
        name: 'Solveria',
        email: 'j.seferdjeli@gmail.com',
      },
      to: [
        {
          email: 'contact@solveria.fr',
          name: 'Jalal',
        },
      ],
      subject: `Nouvelle demande de devis - ${nom} ${prenom}`,
      htmlContent,
      textContent,
    };

    console.log('[API] Brevo payload:', JSON.stringify(brevoPayload, null, 2));

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    console.log('[API] Brevo response status:', brevoResponse.status);

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      console.error('[API] Brevo error response:', errorData);
      return res.status(500).json({ error: 'Erreur Brevo: ' + errorData });
    }

    const brevoResult = await brevoResponse.json();
    console.log('[API] Brevo success:', brevoResult);

    return res.status(200).json({ success: true, message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error('[API] Error in contact form:', error);
    return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
  }
}
