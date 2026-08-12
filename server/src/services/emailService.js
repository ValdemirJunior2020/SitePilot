import axios from 'axios'

export function emailAlertsEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export async function sendPriceAlert({ to, productName, oldPrice, newPrice, currency = 'USD', productUrl, targetPrice }) {
  if (!to || !emailAlertsEnabled()) return { sent: false, reason: 'Email alerts are not configured.' }

  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  const drop = oldPrice != null ? oldPrice - newPrice : null
  const percent = oldPrice ? ((drop / oldPrice) * 100).toFixed(1) : null
  const targetLine = targetPrice != null && newPrice <= targetPrice
    ? `<p style="margin:8px 0;color:#166534"><strong>Your target of ${money(targetPrice)} has been reached.</strong></p>`
    : ''

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033">
      <div style="background:#101a33;color:white;padding:22px 26px;border-radius:16px 16px 0 0">
        <div style="font-size:13px;opacity:.75">SitePilot Price Watch</div>
        <h1 style="font-size:24px;margin:8px 0 0">Price drop detected</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:26px;border-radius:0 0 16px 16px">
        <h2 style="font-size:18px;margin-top:0">${productName}</h2>
        <p style="font-size:28px;font-weight:700;margin:12px 0;color:#4f46e5">${money(newPrice)}</p>
        ${oldPrice != null ? `<p>Previous price: <s>${money(oldPrice)}</s>${drop > 0 ? ` &nbsp; You save ${money(drop)} (${percent}%)` : ''}</p>` : ''}
        ${targetLine}
        <p><a href="${productUrl}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:11px 16px;border-radius:9px;font-weight:700">View product</a></p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px">This alert was sent because you created a SitePilot price watch.</p>
      </div>
    </div>`

  const response = await axios.post('https://api.resend.com/emails', {
    from: process.env.EMAIL_FROM,
    to: [to],
    subject: `Price drop: ${productName} is now ${money(newPrice)}`,
    html
  }, {
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    }
  })

  return { sent: true, id: response.data?.id || null }
}
