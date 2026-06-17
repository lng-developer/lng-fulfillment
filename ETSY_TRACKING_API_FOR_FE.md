# Etsy Tracking API For FE

Tai lieu nay chi mo ta API update tracking cho Etsy order.

Base API prefix hien tai:

```txt
/api/etsy
```

API bulk update tracking yeu cau auth token giong cac protected Etsy order actions khac.

## Update Tracking Cho Tat Ca Items Trong Order

Dung API nay khi FE muon cap nhat fulfillment/tracking/status cho toan bo items cua mot Etsy order. Note thi khong update dai tra cho tat ca item; note phai chi ro item dich bang `transactionId` hoac gui map/list `itemNotes`.

### Endpoint

```http
PATCH /api/etsy/:orderId/tracking
PUT /api/etsy/:orderId/tracking
```

`PATCH` va `PUT` dang map cung mot controller, FE co the dung `PATCH`.

### Request Body

Tat ca field deu optional, nhung request phai co it nhat mot field co the update:

```json
{
  "fulfillment": "MANGOTEE",
  "tracking": "9400111206213333333333",
  "status": "Shipping",
  "transactionId": "ETSY_TRANSACTION_ID",
  "note": "Tracking uploaded from vendor"
}
```

Field y nghia:

| Field | Type | Scope | Ghi chu |
| --- | --- | --- | --- |
| `fulfillment` | string | Tat ca items | Ghi vao `items[].tracking_info.fulfillment`. |
| `tracking` | string | Tat ca items | Ghi vao `items[].tracking_info.tracking`. Neu co tracking khac rong, backend tu set item status thanh `Shipped`. |
| `status` | string | Tat ca items | Trang thai tracking muon set. Xem danh sach status hop le ben duoi. |
| `transactionId` | string | Mot item | Item dich cho `note`. Etsy dung `transactionId` la ID chinh. |
| `orderItemId` | string | Mot item | Alias tuong thich cho `transactionId`. |
| `note` | string | Mot item | Chi duoc gui khi co `transactionId` hoac `orderItemId`. |
| `itemNotes` | object/array | Nhieu items | Dung khi muon update note cho nhieu items trong cung order. |

Status hop le:

```txt
New
In progress
Fulfilled
Shipping
Shipped
Canceled
Cancelled
```

### Vi Du Payload

Cap nhat tracking cho tat ca items, backend tu set tracking status thanh `Shipped`:

```json
{
  "fulfillment": "MANGOTEE",
  "tracking": "9400111206213333333333"
}
```

Set status cho tat ca items:

```json
{
  "status": "Shipping"
}
```

Set tracking cho tat ca items va note cho mot item:

```json
{
  "tracking": "9400111206213333333333",
  "transactionId": "379123456789",
  "note": "Use this tracking for item A"
}
```

Set note cho nhieu items bang object:

```json
{
  "itemNotes": {
    "379123456789": "Tracking checked",
    "379123456790": "Second item note"
  }
}
```

Set note cho nhieu items bang array:

```json
{
  "itemNotes": [
    {
      "transactionId": "379123456789",
      "note": "Tracking checked"
    },
    {
      "orderItemId": "379123456790",
      "note": "Second item note"
    }
  ]
}
```

Backend cung accept alias `notesByTransactionId` hoac `notes` thay cho `itemNotes`, nhung FE nen dung `itemNotes`.

### Success Response

```json
{
  "message": "Etsy tracking updated for ALL items (priority: Canceled/Cancelled > auto-Ship on tracking). Item & order statuses synced.",
  "orderId": "ETSY_ORDER_ID",
  "orderStatus": "Shipped",
  "scale_overall_status": "Sent",
  "applied": {
    "fulfillment": "MANGOTEE",
    "tracking": "9400111206213333333333",
    "status": "Shipped",
    "noteUpdates": [
      {
        "transactionId": "379123456789",
        "note": "Use this tracking for item A"
      }
    ],
    "noteResults": [
      {
        "transactionId": "379123456789",
        "matched": 1,
        "modified": 1
      }
    ]
  }
}
```

### Backend Behavior FE Can Rely On

- `fulfillment`, `tracking`, va `status` update cho tat ca `items[]`.
- `note` khong phai order-wide field. Neu gui `note`, FE bat buoc gui kem `transactionId` hoac `orderItemId`, hoac dung `itemNotes`.
- Neu `tracking` duoc gui va khac rong, backend uu tien set tracking status thanh `Shipped`.
- Neu `status` la `Canceled` hoac `Cancelled`, backend normalize thanh `Cancelled`.
- Sau khi update item statuses, backend tinh lai `order.status` tu tat ca items.
- Neu status moi la `Fulfilled`, `Shipping`, hoac `Shipped`, backend set `items[].scale_status = "Complete"` va `scale_overall_status = "Sent"`.
- Neu status moi la `Cancelled`, backend set `items[].scale_status = "Cancelled"` va `scale_overall_status = "Cancelled"`.
- Neu `order.status` thay doi, backend ghi order history voi action `UPDATE_STATUS`.

### Error Responses

Thieu `orderId`:

```json
{
  "message": "orderId is required"
}
```

Order khong ton tai:

```json
{
  "message": "Etsy order not found"
}
```

Status khong hop le:

```json
{
  "message": "Invalid status",
  "allowed": ["New", "In progress", "Fulfilled", "Shipping", "Shipped", "Canceled", "Cancelled"]
}
```

Gui `note` nhung khong chi ro item:

```json
{
  "message": "note must target a specific item. Provide transactionId/orderItemId, or use itemNotes."
}
```

Khong co field nao de update:

```json
{
  "message": "No updatable fields provided (fulfillment/tracking/status/itemNotes)"
}
```

### FE Integration Notes

- Sau success, refresh lai Etsy order detail/list row de lay `items[].tracking_info`, `orderStatus`, va `scale_overall_status` moi.
- Khi render item-level note, dung `transactionId` cua item de map note update.
- Neu FE chi update tracking number, khong can gui `status`; backend se tu tra ve `applied.status = "Shipped"`.
- Khong nen gui mot `note` don le ma khong co target item, vi backend se reject `400`.
