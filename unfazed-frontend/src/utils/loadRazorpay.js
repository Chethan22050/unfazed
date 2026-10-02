let checkoutScriptPromise

export default function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve()
  if (checkoutScriptPromise) return checkoutScriptPromise

  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => window.Razorpay ? resolve() : reject(new Error('Payment checkout could not load.'))
    script.onerror = () => reject(new Error('Payment checkout could not load.'))
    document.head.appendChild(script)
  }).catch((error) => {
    checkoutScriptPromise = null
    throw error
  })

  return checkoutScriptPromise
}