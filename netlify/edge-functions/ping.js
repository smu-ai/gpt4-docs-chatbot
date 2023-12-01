import { corsHeaders } from "../_shared/cors.js";
import { initPinecone } from "../_shared/vectorstore.js";

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
        const pinecone = await initPinecone();
        const PINECONE_INDEX_NAME = Deno.env.get('PINECONE_INDEX_NAME');
        const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name
        const indexData = await index.describeIndexStats();

        console.log('PING response: ', indexData);

        return new Response(JSON.stringify(indexData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
};

export const config = { path: "/chat" };

export default serve;
