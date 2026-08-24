/**
 * Walton Trailers — AI Chat Worker
 * Deploy to Cloudflare Workers (free tier) to enable Claude-powered
 * responses in the support chat widget.
 *
 * ─── SETUP INSTRUCTIONS ───────────────────────────────────────────
 *
 * 1. Create a free Cloudflare account at cloudflare.com
 * 2. Go to Workers & Pages → Create Application → Create Worker
 * 3. Paste this entire file into the editor and click "Deploy"
 * 4. Go to Settings → Variables → add a Secret:
 *      Name:  ANTHROPIC_API_KEY
 *      Value: your Anthropic API key (from console.anthropic.com)
 * 5. Copy your Worker URL (e.g. https://walton-chat.YOUR-NAME.workers.dev)
 * 6. In index.html, find:   var AI_ENDPOINT = '';
 *    and change it to:      var AI_ENDPOINT = 'https://walton-chat.YOUR-NAME.workers.dev';
 * 7. Push changes to GitHub — the chat widget will now use Claude!
 *
 * ─── WHAT THIS DOES ───────────────────────────────────────────────
 * - Receives chat messages from the website
 * - Adds a Walton Trailers system prompt so Claude responds in context
 * - Calls the Anthropic API server-side (keeps your API key secret)
 * - Returns Claude's reply to the chat widget
 *
 * ──────────────────────────────────────────────────────────────────
 */

const SYSTEM_PROMPT = `You are the support assistant for Walton Trailers, a commercial trailer manufacturer based in Logan, Utah. Walton has been building trailers since 1973 and sells through an authorized dealer network across the United States.

Your role is to help website visitors find the right trailer, answer questions about specs and features, explain warranty and owner support options, and direct people to dealers when appropriate.

Key product lines:
- Gooseneck Flatbeds (FBH & FBX Series) — heavy hauling, 14,000–40,000+ lb GVWR
- Dump Trailers (DHO & DHV Series) — hydraulic hoist, multiple lengths
- Tilt Deck Equipment Trailers (TSX & TMX Series) — full tilt deck, no ramps needed
- Deckover Equipment Trailers (BDE Series) — flush wide deck, no wheel wells
- Landscape Trailers (MPR Series) — lawn care and light equipment

Key facts:
- New trailers carry a Lifetime Structural Warranty on the frame. Coverage on an
  existing trailer depends on its VIN prefix (first three characters of the VIN):
  7X1 is Walton Transportation's own prefix (the entity took over operations in
  September 2023, so there are no 7X1 units older than that). 7X1 built in December 2024 OR LATER: lifetime structural warranty, whenever it was purchased. 7X1
  built between September 2023 and November 2024: a 3-year limited structural
  warranty whose term starts at the EARLIER of the retail purchase date or six
  months after Walton sold the trailer to the dealer — so a trailer that sat on
  a dealer lot two years is already 18 months into its term when bought. Never
  assume the term starts at purchase; tell the buyer to ask the dealer when
  Walton sold it to them. 1W9 and 7SR trailers were
  manufactured under a DIFFERENT ENTITY and carry NO WALTON TRANSPORTATION
  WARRANTY, regardless of purchase date, unless a written agreement signed by
  Walton Transportation, LLC and the end customer says otherwise.
- Component warranties are separate and may still be in force on a 1W9 or 7SR
  trailer: tires, axles, brake components, springs and suspension, couplers,
  jacks and batteries are warranted by their own manufacturers. Tell those
  owners to submit component claims directly to the component vendor, following
  that vendor's process. Walton does not administer those claims. Do not leave
  a 1W9 or 7SR owner thinking they have no recourse at all.
- Never tell a visitor their trailer is covered without knowing the VIN prefix,
  and never assume a signed agreement exists. Ask for the prefix, or send them to
  warranty@waltontrailers.com with their VIN. The controlling document is
  waltontrailers.com/warranty-policy.html
- Built with heavy-duty tube steel, DOT LED lighting, 7-pin wiring
- Sold through dealers only — not direct from the factory
- Owner support (manuals, warranty claims, registration) is at waltontrailers.com/user-manuals.html
- Dealer locator is at waltontrailers.com/#dealers

Guidelines:
- Be friendly, concise, and helpful
- For pricing, always direct to a local dealer since prices vary
- For custom builds, direct to a dealer
- Keep responses under 3–4 short paragraphs
- If unsure, offer to connect them with the team`;

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      const messages = body.messages || [];

      // Call Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', // fast and cost-efficient for chat
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: messages.slice(-10), // keep last 10 messages for context
        }),
      });

      const data = await response.json();
      const reply = data?.content?.[0]?.text || "I'm having trouble right now — please try again or send us a message directly.";

      return new Response(JSON.stringify({ reply }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ reply: "Something went wrong on my end. Please try again shortly." }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
