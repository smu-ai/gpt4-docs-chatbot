import { corsHeaders } from "../_shared/cors.js";

const serve = async (req) => {
    // This is needed if you're planning to invoke your function from a browser.
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    //only accept GET requests
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log('pining from: ', req);

    try {
        const response = { status: "OK" };
        console.log('PING response: ', response);

        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
};

export const config = { path: "/ping" };

export default serve;
