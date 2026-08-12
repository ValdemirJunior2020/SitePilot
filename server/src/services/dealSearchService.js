import axios from 'axios'

export async function searchShoppingDeals(query, { maxResults = 12 } = {}) {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    return {
      enabled: false,
      provider: 'SerpApi Google Shopping',
      results: [],
      message: 'Broader shopping search is not configured. Add SERPAPI_KEY on the server to search Google Shopping.'
    }
  }

  const response = await axios.get('https://serpapi.com/search.json', {
    timeout: 25000,
    params: {
      engine: 'google_shopping',
      q: query,
      api_key: apiKey,
      gl: process.env.SHOPPING_COUNTRY || 'us',
      hl: process.env.SHOPPING_LANGUAGE || 'en'
    }
  })

  const results = (response.data?.shopping_results || [])
    .map((item) => ({
      title: item.title || '',
      source: item.source || 'Unknown store',
      price: Number.isFinite(item.extracted_price) ? item.extracted_price : null,
      oldPrice: Number.isFinite(item.extracted_old_price) ? item.extracted_old_price : null,
      priceText: item.price || '',
      link: item.product_link || item.link || '',
      thumbnail: item.thumbnail || '',
      rating: item.rating ?? null,
      reviews: item.reviews ?? null,
      delivery: item.delivery || '',
      tag: item.tag || item.badge || ''
    }))
    .filter((item) => item.title && (item.price != null || item.priceText))
    .sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER))
    .slice(0, maxResults)

  return { enabled: true, provider: 'SerpApi Google Shopping', results, message: null }
}
