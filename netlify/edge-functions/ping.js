import { initPinecone } from "../_shared/vectorstore.js";

const getIndexData = async () => {
    const pinecone = await initPinecone(Deno.env);
    console.log('pinecone:', pinecone);

    const PINECONE_INDEX_NAME = Deno.env.get('PINECONE_INDEX_NAME');
    console.log('PINECONE_INDEX_NAME:', PINECONE_INDEX_NAME);

    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name
    const indexData = await index.describeIndexStats();
    console.log('indexData:', indexData);

    return indexData;
}

const serve = async (req) => {
    console.log('pining from:', req);

    //only accept GET requests
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const indexData = await getIndexData();
        const response = { status: "OK", indexData };
        console.log('PING response:', response);

        return new Response(JSON.stringify(response), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

export const config = { path: "/ping" };

export default serve;
