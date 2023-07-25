import type { NextApiRequest, NextApiResponse } from 'next';
import { initPinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME } from '@/config/pinecone';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    //only accept GET requests
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const pinecone = await initPinecone();
    const index = pinecone.Index(PINECONE_INDEX_NAME!); //change to your own index name
    const indexData = await index.describeIndexStats({
        describeIndexStatsRequest: {},
    });

    console.log('PING response: ', indexData);
    res.json(indexData);
}
