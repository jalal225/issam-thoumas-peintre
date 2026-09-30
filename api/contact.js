export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { 'fi-sender-firstName': prenom, 'fi-sender-lastName': nom, 'fi-sender-phone': telephone, 'fi-sender-email': email, 'fi-select-type_travaux': typeTravaux, 'fi-text-description': description } = req.body;

    // Validation basique
    if (!prenom || !nom || !telephone || !typeTravaux) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY non configurée');
      return res.status(500).json({ error: 'Service indisponible' });
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
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Issam Peinture',
          email: 'noreply@issam-peinture.fr',
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
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      console.error('Brevo API error:', errorData);
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }

    return res.status(200).json({ success: true, message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error('Error in contact form:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
