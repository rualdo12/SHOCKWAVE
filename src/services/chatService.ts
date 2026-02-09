import { Message } from '../types';

const FALLBACK_RESPONSES: Array<{ match: RegExp; response: string }> = [
  {
    match: /services|offer|what do you do/i,
    response:
      'We specialize in photography, cinematic video, digital marketing, and branding. Tell me what you need and I can guide you to the right service.',
  },
  {
    match: /pricing|price|cost|rate|quote/i,
    response:
      "Pricing depends on scope, location, and turnaround. If you'd like, I can connect you to a quote request and gather a few details first.",
  },
  {
    match: /portfolio|work|examples/i,
    response:
      'You can explore our latest work in the portfolio section. Want me to point you to photography, video, or brand case studies?',
  },
  {
    match: /book|booking|schedule|availability/i,
    response:
      'We can help you book a shoot or consultation. Share your city, preferred date range, and the type of project.',
  },
  {
    match: /contact|email|call/i,
    response:
      'You can reach the GoToGuys team via the Contact section on the site. I can also collect your name and project details to pass along.',
  },
];

const defaultResponse =
  'Happy to help. Tell me a bit about your project (type of shoot, location, and timing) and I will point you to the next step.';

// Optional backend proxy endpoint; keeps API keys out of the client bundle.
const endpoint = import.meta.env.VITE_GOTOGUYS_AI_ENDPOINT as string | undefined;

export async function getChatbotResponse(history: Message[], newMessage: string): Promise<string> {
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, message: newMessage }),
    });

    if (!response.ok) {
      throw new Error('Chat service error');
    }

    const data = (await response.json()) as { reply?: string };
    if (data?.reply) {
      return data.reply;
    }
  }

  const match = FALLBACK_RESPONSES.find((entry) => entry.match.test(newMessage));
  return match ? match.response : defaultResponse;
}
