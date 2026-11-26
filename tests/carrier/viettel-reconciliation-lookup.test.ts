import assert from 'node:assert/strict';
import { lookupViettelPostOrderShipments } from '@/integrations/viettel-post/adapter';
import type { CarrierAdapterContext } from '@/modules/carrier/types';
const context: CarrierAdapterContext = { tenantId: 'tenant', credentials: { source: 'tenantCredential', carrierAccountId: 'acc2', credentialId: 'credential', payload: { clientId: 'client', clientSecret: 'test', authUrl: 'https://auth-staging.logistek.com.vn', orderUrl: 'https://order-staging.logistek.com.vn', lineShipId: 'line', shipFromFirstName: 'Test', shipFromLastName: 'Sender', shipFromPhoneNumber: '123456789', shipFromAddress1: 'Address', shipFromCountry: 'VN', shipFromState: 'HN', shipFromCity: 'HN', shipFromZipCode: '10000', liveEnabled: true } } };
async function main() {
    let calls = 0;
    const oldToken = process.env.VIETTEL_POST_BEARER_TOKEN;
    process.env.VIETTEL_POST_BEARER_TOKEN = 'must-not-use';
    try {
        const result = await lookupViettelPostOrderShipments(context, 'order', async (url, init) => {
            calls++;
            if (String(url).endsWith('/connect/token'))
                return Response.json({ access_token: 'account-token' });
            assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer account-token');
            assert.ok(String(url).includes('filter=order'));
            return Response.json({ data: { totalCount: 2, items: [{ id: 'new', orderId: 'order', shipmentCode: 'EPK-new', status: 1, trackingNumber: '9214490374008505253650', dateCreate: '2026-11-25' }, { id: 'other', orderId: 'different', status: 1 }] } });
        });
        assert.equal(calls, 2);
        assert.equal(result.length, 1);
        assert.equal(result[0].shipmentCode, 'EPK-new');
        await assert.rejects(lookupViettelPostOrderShipments(context, 'order', async (url) => String(url).endsWith('/connect/token') ? Response.json({ access_token: 'test' }) : Response.json({ data: { totalCount: 60, items: [] } })), /pagination/);
        await assert.rejects(lookupViettelPostOrderShipments(context, 'order', async (url) => String(url).endsWith('/connect/token') ? Response.json({ access_token: 'test' }) : Response.json({ data: { items: [{ orderId: 'order', status: 1 }] } })), /identity/);
        const page = Array.from({length:50},(_,i)=>({id:'row-'+i,orderId:'order',shipmentCode:'EPK-'+i,status:1}));
        const full = await lookupViettelPostOrderShipments(context,'order',async url => String(url).endsWith('/connect/token') ? Response.json({access_token:'test'}) : Response.json({data:{totalCount:50,items:page}}));
        assert.equal(full.length,50,'exact full final page must complete');
        let pages=0;
        const discovery = await lookupViettelPostOrderShipments(context,undefined,async url => {
          if(String(url).endsWith('/connect/token'))return Response.json({access_token:'test'});
          pages++; return Response.json({data:{totalCount:1000,items:page}});
        });
        assert.equal(discovery.length,200);assert.equal(pages,4,'discovery is bounded, exact lookup supplies completeness');
        console.log('PASS: account OAuth, exact order, fail-closed incomplete pages and identities.');
    }
    finally {
        if (oldToken === undefined)
            delete process.env.VIETTEL_POST_BEARER_TOKEN;
        else
            process.env.VIETTEL_POST_BEARER_TOKEN = oldToken;
    }
}
void main();
