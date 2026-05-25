# 11 YunExpress CreateOrderLabel Test Payloads

Tài liệu này ghi audit `YUN-AUDIT-001` và payload test an toàn cho manual UI/API review. Không chứa credential, Authorization token, cookie, DB URL hoặc secret.

## Compliance Notes

- Endpoint theo markdown: `POST {{baseUrl}}/api/WayBill/CreateOrderLabel`.
- Body là JSON array trực tiếp, không wrap trong `{ "orders": [...] }`.
- Batch tối đa 10 orders/lần.
- Auth server-side dùng `Authorization: Basic Base64(CustomerNo&ApiSecret)`.
- Header cần có `__lang` và `Content-Type: application/json`.
- `Code="0000"` chỉ là request-level success; business success cần `Item[].Success=1`.
- `WayBillNumber`, `TrackingNumber`, `Label.Url`, `Label.LabelType`, `Label.LabelString`, `Remark` phải được normalize an toàn.
- Khi `YUN_OMS_LIVE_ENABLED=false`, adapter phải block trước network call.

## Exact Single-Order Body

```json
[
  {
    "CustomerOrderNumber": "YUN-TEST-0123456789",
    "ShippingMethodCode": "VN-YTYCPREC",
    "TrackingNumber": null,
    "TransactionNumber": null,
    "SizeUnits": "cm",
    "Length": 20,
    "Width": 15,
    "Height": 5,
    "PackageCount": 1,
    "Weight": 0.1,
    "ApplicationType": 4,
    "ReturnOption": 0,
    "TariffPrepay": 0,
    "InsuranceOption": 0,
    "SourceCode": "API",
    "Receiver": {
      "CountryCode": "US",
      "FirstName": "Rachel",
      "LastName": "Cloud",
      "Company": "",
      "Street": "1701 Example Street",
      "City": "OCEANO",
      "State": "CA",
      "Zip": "93445",
      "Phone": "1234567890",
      "Email": "test@example.com"
    },
    "Parcels": [
      {
        "EName": "baseball cap",
        "CName": "帽子",
        "HSCode": null,
        "Quantity": 1,
        "SKU": "CAP001",
        "UnitPrice": 10,
        "UnitWeight": 0.1,
        "Remark": "baseball cap",
        "CurrencyCode": "USD",
        "InvoicePart": "cotton",
        "InvoiceUsage": "wear"
      }
    ]
  }
]
```

## Unique Timestamp Version

Use this for one manual UI test only. Change `CustomerOrderNumber` before every repeated test to avoid duplicate order errors.

```json
[
  {
    "CustomerOrderNumber": "YUN-TEST-20260520-000001",
    "ShippingMethodCode": "VN-YTYCPREC",
    "TrackingNumber": null,
    "TransactionNumber": null,
    "SizeUnits": "cm",
    "Length": 20,
    "Width": 15,
    "Height": 5,
    "PackageCount": 1,
    "Weight": 0.1,
    "ApplicationType": 4,
    "ReturnOption": 0,
    "TariffPrepay": 0,
    "InsuranceOption": 0,
    "SourceCode": "API",
    "Receiver": {
      "CountryCode": "US",
      "FirstName": "Rachel",
      "LastName": "Cloud",
      "Company": "",
      "Street": "1701 Example Street",
      "City": "OCEANO",
      "State": "CA",
      "Zip": "93445",
      "Phone": "1234567890",
      "Email": "test@example.com"
    },
    "Parcels": [
      {
        "EName": "baseball cap",
        "CName": "帽子",
        "HSCode": null,
        "Quantity": 1,
        "SKU": "CAP001",
        "UnitPrice": 10,
        "UnitWeight": 0.1,
        "Remark": "baseball cap",
        "CurrencyCode": "USD",
        "InvoicePart": "cotton",
        "InvoiceUsage": "wear"
      }
    ]
  }
]
```

## Two-Order Batch Example

```json
[
  {
    "CustomerOrderNumber": "YUN-TEST-BATCH2-001",
    "ShippingMethodCode": "VN-YTYCPREC",
    "TrackingNumber": null,
    "TransactionNumber": null,
    "SizeUnits": "cm",
    "Length": 20,
    "Width": 15,
    "Height": 5,
    "PackageCount": 1,
    "Weight": 0.1,
    "ApplicationType": 4,
    "ReturnOption": 0,
    "TariffPrepay": 0,
    "InsuranceOption": 0,
    "SourceCode": "API",
    "Receiver": {
      "CountryCode": "US",
      "FirstName": "Rachel",
      "LastName": "Cloud",
      "Company": "",
      "Street": "1701 Example Street",
      "City": "OCEANO",
      "State": "CA",
      "Zip": "93445",
      "Phone": "1234567890",
      "Email": "test@example.com"
    },
    "Parcels": [
      {
        "EName": "baseball cap",
        "CName": "帽子",
        "HSCode": null,
        "Quantity": 1,
        "SKU": "CAP001",
        "UnitPrice": 10,
        "UnitWeight": 0.1,
        "Remark": "baseball cap",
        "CurrencyCode": "USD",
        "InvoicePart": "cotton",
        "InvoiceUsage": "wear"
      }
    ]
  },
  {
    "CustomerOrderNumber": "YUN-TEST-BATCH2-002",
    "ShippingMethodCode": "VN-YTYCPREC",
    "TrackingNumber": null,
    "TransactionNumber": null,
    "SizeUnits": "cm",
    "Length": 20,
    "Width": 15,
    "Height": 5,
    "PackageCount": 1,
    "Weight": 0.1,
    "ApplicationType": 4,
    "ReturnOption": 0,
    "TariffPrepay": 0,
    "InsuranceOption": 0,
    "SourceCode": "API",
    "Receiver": {
      "CountryCode": "US",
      "FirstName": "Rachel",
      "LastName": "Cloud",
      "Company": "",
      "Street": "1701 Example Street",
      "City": "OCEANO",
      "State": "CA",
      "Zip": "93445",
      "Phone": "1234567890",
      "Email": "test@example.com"
    },
    "Parcels": [
      {
        "EName": "baseball cap",
        "CName": "帽子",
        "HSCode": null,
        "Quantity": 1,
        "SKU": "CAP001",
        "UnitPrice": 10,
        "UnitWeight": 0.1,
        "Remark": "baseball cap",
        "CurrencyCode": "USD",
        "InvoicePart": "cotton",
        "InvoiceUsage": "wear"
      }
    ]
  }
]
```

## Ten-Order Max Batch Example

```json
[
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-001", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-002", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-003", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-004", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-005", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-006", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-007", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-008", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-009", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] },
  { "CustomerOrderNumber": "YUN-TEST-BATCH10-010", "ShippingMethodCode": "VN-YTYCPREC", "TrackingNumber": null, "TransactionNumber": null, "SizeUnits": "cm", "Length": 20, "Width": 15, "Height": 5, "PackageCount": 1, "Weight": 0.1, "ApplicationType": 4, "ReturnOption": 0, "TariffPrepay": 0, "InsuranceOption": 0, "SourceCode": "API", "Receiver": { "CountryCode": "US", "FirstName": "Rachel", "LastName": "Cloud", "Company": "", "Street": "1701 Example Street", "City": "OCEANO", "State": "CA", "Zip": "93445", "Phone": "1234567890", "Email": "test@example.com" }, "Parcels": [{ "EName": "baseball cap", "CName": "帽子", "HSCode": null, "Quantity": 1, "SKU": "CAP001", "UnitPrice": 10, "UnitWeight": 0.1, "Remark": "baseball cap", "CurrencyCode": "USD", "InvoicePart": "cotton", "InvoiceUsage": "wear" }] }
]
```

## Eleven-Order Negative Test

Do not generate or submit an 11-order body. Use a validation-only negative test that asserts local/client validation rejects batch size greater than 10 before any YunExpress network call.
