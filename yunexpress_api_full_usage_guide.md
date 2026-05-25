# YunExpress OMS API — Tổng hợp API và hướng dẫn sử dụng

**Tài liệu nguồn:** YunExpress API Development Specification — OMS Version 1.4.2, ngày 2026-02-04  
**ServerAddress đang test:** `http://oms.api.yunexpress.com`  
**Định dạng request/response:** request dùng URI + parameters hoặc JSON body tùy API; response trả JSON, UTF-8.

---

## 0. Tổng hợp toàn bộ API và chức năng

> Base URL dùng trong Postman:
>
> ```text
> {{baseUrl}} = http://oms.api.yunexpress.com
> ```

| STT | Nhóm               | Method | Endpoint                            | Chức năng chính                           | Dữ liệu đầu vào chính                              | Dữ liệu trả về chính                                       | Ghi chú sử dụng                                                 |
| --: | ------------------ | ------ | ----------------------------------- | ----------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
|   1 | Common             | `GET`  | `/api/Common/GetCountry`            | Lấy danh sách mã quốc gia                 | Không có                                           | `Items[].CountryCode`, `EName`, `CName`                    | API test kết nối đầu tiên                                       |
|   2 | Common             | `GET`  | `/api/Common/GetShippingMethods`    | Lấy danh sách phương thức vận chuyển      | `CountryCode` optional                             | `Items[].Code`, `EName`, `DisplayName`                     | Dùng để lấy `ShippingMethodCode`                                |
|   3 | Common             | `GET`  | `/api/Common/GetGoodsType`          | Lấy danh sách loại hàng hóa               | Không có                                           | `Items[].Id`, `EName`, `CName`                             | Dùng tham khảo loại hàng/sensitive type                         |
|   4 | Freight            | `GET`  | `/api/Freight/GetPriceTrial`        | Tính thử phí vận chuyển                   | `CountryCode`, `Weight`, `PackageType`, kích thước | `ShippingFee`, `TotalFee`, `Currency`, `Code`              | Dùng trước khi tạo waybill                                      |
|   5 | Waybill / Tracking | `GET`  | `/api/Waybill/GetTrackingNumber`    | Lấy tracking number                       | `CustomerOrderNumber`                              | `WayBillNumber`, `TrackingNumber`, `Status`                | Có cache khoảng 30 phút                                         |
|   6 | Waybill            | `GET`  | `/api/WayBill/GetSender`            | Query sender được YunExpress assign       | `OrderNumber`                                      | Sender address info                                        | Dùng khi cần địa chỉ sender của đơn                             |
|   7 | Waybill            | `POST` | `/api/WayBill/CreateOrder`          | Tạo waybill / forecast order              | JSON array order objects                           | `Success`, `WayBillNumber`, `TrackingNumber`, `RemoteArea` | API chính để đẩy đơn sang YunExpress; batch tối đa 10 đơn/lần   |
|   8 | Waybill            | `GET`  | `/api/WayBill/GetOrder`             | Query chi tiết waybill/order              | `OrderNumber`                                      | Order detail, receiver, sender, parcels, status            | Nên test trước các API tracking                                 |
|   9 | Waybill            | `POST` | `/api/WayBill/UpdateWeight`         | Sửa forecast weight                       | `OrderNumber`, `Weight`                            | `Status`, `Remark`                                         | Chỉ dùng khi đơn còn forecasted                                 |
|  10 | Waybill            | `POST` | `/api/WayBill/Delete`               | Xóa waybill/order                         | `OrderType`, `OrderNumber`                         | `Status`, `Remark`                                         | Chỉ hỗ trợ draft/forecasted waybill                             |
|  11 | Waybill            | `POST` | `/api/WayBill/Intercept`            | Chặn/intercept order                      | `OrderType`, `OrderNumber`, `Remark`               | `Result`, `Remark`                                         | Chỉ hỗ trợ forecasted/warehoused order                          |
|  12 | Label              | `POST` | `/api/Label/Print`                  | Lấy link in label PDF                     | JSON array order numbers                           | `Item[].Url`, `OrderInfos`                                 | Body là array trực tiếp, ví dụ `['YT...']`; tối đa 50 label/lần |
|  13 | Freight            | `GET`  | `/api/Freight/GetShippingFeeDetail` | Query chi tiết phí vận chuyển thực tế     | `wayBillNumber`                                    | `Freight`, `FuelSurcharge`, `TotalFee`, `ChargeWeight`     | Dùng sau khi đơn phát sinh charge                               |
|  14 | Common             | `GET`  | `/api/Common/Register`              | Đăng ký user/customer                     | User/company/contact info                          | `CustomerCode`, `ApiSecret`/`SecretKey`                    | Thường ít dùng vì account/API secret do Yun cấp sẵn             |
|  15 | Tracking           | `GET`  | `/api/Tracking/GetTrackInfo`        | Query tracking timeline theo subscription | `OrderNumber`                                      | `PackageState`, `TrackingStatus`, `OrderTrackingDetails`   | Dùng sync tracking định kỳ                                      |
|  16 | Tracking           | `GET`  | `/api/Tracking/GetTrackAllInfo`     | Query toàn bộ tracking history            | `OrderNumber`                                      | Full `OrderTrackingDetails`                                | Dùng debug/full timeline                                        |
|  17 | Tracking           | `POST` | `/api/Waybill/GetCarrier`           | Query last-mile carrier                   | JSON array order numbers                           | `CarrierCode`, `CarrierEName`, `CarrierWebsite`            | Body đúng khi test: `['YT...']`                                 |
|  18 | IOSS               | `POST` | `/api/WayBill/RegisterIoss`         | Filing/đăng ký IOSS number                | IOSS info, platform, file URL                      | `IossCode`, `IossStatus`, `IossNote`                       | Dùng cho EU/IOSS                                                |
|  19 | IOSS               | `POST` | `/api/WayBill/DisableIoss`          | Vô hiệu hóa IOSS number                   | `code`                                             | `Item: true/false`                                         | `code` là IOSS filing code                                      |
|  20 | Waybill + Label    | `POST` | `/api/WayBill/CreateOrderLabel`     | Tạo waybill và lấy label cùng lúc         | JSON array order objects                           | `WayBillNumber`, `TrackingNumber`, `Label.Url`             | Batch tối đa 10 đơn/lần                                         |
|  21 | Common             | `POST` | `/api/common/SelfPickupPoint`       | Lấy danh sách điểm tự nhận hàng           | Country/address/product/weight                     | `Item[].PointRelaisNum`, address, hours                    | Dùng cho tuyến có self pickup point                             |

---

## 1. Cấu hình chung cho Postman

### 1.1 Environment variables

Tạo Environment tên ví dụ: `YunExpress OMS`.

| Variable              | Current Value mẫu               | Ghi chú                                 |
| --------------------- | ------------------------------- | --------------------------------------- |
| `baseUrl`             | `http://oms.api.yunexpress.com` | Không thêm dấu `/` cuối                 |
| `customerNo`          | `ITCxxxxxxx`                    | Customer Number do YunExpress cấp       |
| `apiSecret`           | `xxxxxxxxxxxx`                  | ApiSecret do YunExpress cấp             |
| `yunToken`            | để trống                        | Script tự tạo                           |
| `customerOrderNumber` | mã order test                   | Dùng cho tracking/order query           |
| `wayBillNumber`       | để trống hoặc `YT...`           | Lưu sau khi tạo/query order             |
| `trackingNumber`      | để trống                        | Lưu sau khi tracking generated          |
| `shippingMethodCode`  | để trống hoặc `THZXR`           | Lấy từ GetShippingMethods/GetPriceTrial |
| `carrierOrderNumber`  | để trống                        | Có thể dùng cho GetCarrier              |

### 1.2 Authorization chung

YunExpress yêu cầu header:

```http
Authorization: Basic <Base64(CustomerNumber&ApiSecret)>
```

Ví dụ chuỗi trước khi encode:

```text
ITC0893791&axzc2utvPbfc9UbJDOh+7w==
```

### 1.3 Postman Authorization tab

Trong từng request, chọn:

| Tab           | Giá trị   |
| ------------- | --------- |
| Authorization | `No Auth` |

Không dùng Basic Auth mặc định của Postman, vì Postman Basic Auth encode theo dạng `username:password`, trong khi YunExpress cần encode dạng `CustomerNumber&ApiSecret`.

### 1.4 Collection Pre-request Script

Dán vào:

```text
Collection → Scripts → Pre-request
```

```javascript
const customerNo = pm.environment.get("customerNo");
const apiSecret = pm.environment.get("apiSecret");

if (!customerNo || !apiSecret) {
  throw new Error("Missing customerNo or apiSecret in Environment");
}

const rawToken = `${customerNo}&${apiSecret}`;
const token = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(rawToken));

pm.environment.set("yunToken", token);

pm.request.headers.upsert({
  key: "Accept",
  value: "application/json",
});

pm.request.headers.upsert({
  key: "Authorization",
  value: `Basic ${token}`,
});

pm.request.headers.upsert({
  key: "__lang",
  value: "en-US",
});

pm.request.headers.upsert({
  key: "Content-Type",
  value: "application/json",
});
```

### 1.5 Headers chung

| Key             | Value                | Khi nào dùng                             |
| --------------- | -------------------- | ---------------------------------------- |
| `Accept`        | `application/json`   | Tất cả API                               |
| `Authorization` | `Basic {{yunToken}}` | Tất cả API                               |
| `__lang`        | `en-US`              | Tất cả API; có thể dùng `zh-CN`, `zh-HK` |
| `Content-Type`  | `application/json`   | POST hoặc GET có body/query complex      |

---

## 2. Flow test khuyến nghị

### 2.1 Flow kiểm tra kết nối và cấu hình

```text
1. GET /api/Common/GetCountry
2. GET /api/Common/GetShippingMethods?CountryCode=US
3. GET /api/Freight/GetPriceTrial
```

### 2.2 Flow tạo đơn và lấy label

```text
1. GET  /api/Common/GetShippingMethods?CountryCode=US
2. GET  /api/Freight/GetPriceTrial
3. POST /api/WayBill/CreateOrder
4. GET  /api/WayBill/GetOrder
5. GET  /api/Waybill/GetTrackingNumber
6. POST /api/Label/Print
```

### 2.3 Flow tracking nên test

```text
1. GET  /api/WayBill/GetOrder
2. GET  /api/Waybill/GetTrackingNumber
3. GET  /api/Tracking/GetTrackInfo
4. GET  /api/Tracking/GetTrackAllInfo
5. POST /api/Waybill/GetCarrier
```

---

# 3. Chi tiết từng API

---

## API 1 — GetCountry

### Chức năng

Lấy danh sách mã quốc gia `CountryCode` mà YunExpress hỗ trợ.

### Postman

| Vị trí        | Giá trị                             |
| ------------- | ----------------------------------- |
| Method        | `GET`                               |
| URL           | `{{baseUrl}}/api/Common/GetCountry` |
| Authorization | `No Auth`                           |
| Params        | Không có                            |
| Body          | `none`                              |

### Headers

| Key             | Value                |
| --------------- | -------------------- |
| `Accept`        | `application/json`   |
| `Authorization` | `Basic {{yunToken}}` |
| `__lang`        | `en-US`              |

### Example request

```http
GET {{baseUrl}}/api/Common/GetCountry
```

### Expected response

```json
{
  "Items": [
    {
      "CountryCode": "US",
      "EName": "UNITED STATES",
      "CName": "United States"
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully",
  "RequestId": "...",
  "TimeStamp": "..."
}
```

### Response fields

| Field                 | Ý nghĩa                         |
| --------------------- | ------------------------------- |
| `Items[].CountryCode` | Mã quốc gia 2 ký tự             |
| `Items[].EName`       | Tên tiếng Anh                   |
| `Items[].CName`       | Tên hiển thị/Chinese name field |
| `Code`                | Mã kết quả                      |

---

## API 2 — GetShippingMethods

### Chức năng

Lấy danh sách phương thức vận chuyển. Có thể lọc theo quốc gia.

### Postman

| Vị trí        | Giá trị                                     |
| ------------- | ------------------------------------------- |
| Method        | `GET`                                       |
| URL           | `{{baseUrl}}/api/Common/GetShippingMethods` |
| Authorization | `No Auth`                                   |
| Body          | `none`                                      |

### Params

| Key           | Required | Value mẫu | Ghi chú                                                        |
| ------------- | -------- | --------- | -------------------------------------------------------------- |
| `CountryCode` | No       | `US`      | Nếu không truyền, API trả shipping methods cho tất cả quốc gia |

### Example request

```http
GET {{baseUrl}}/api/Common/GetShippingMethods?CountryCode=US
```

### Expected response

```json
{
  "Items": [
    {
      "Code": "THZXR",
      "CName": "...",
      "EName": "Yunexpress Global Driect Economical Line",
      "HasTrackingNumber": true,
      "DisplayName": "YunExpress Global Private Line Registration"
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

### Response fields

| Field                       | Ý nghĩa                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `Items[].Code`              | Shipping method code, dùng cho `ShippingMethodCode` khi tạo waybill |
| `Items[].HasTrackingNumber` | Tuyến có tracking hay không                                         |
| `Items[].DisplayName`       | Tên hiển thị của shipping method                                    |

---

## API 3 — GetGoodsType

### Chức năng

Lấy danh sách loại hàng hóa.

### Postman

| Vị trí        | Giá trị                               |
| ------------- | ------------------------------------- |
| Method        | `GET`                                 |
| URL           | `{{baseUrl}}/api/Common/GetGoodsType` |
| Authorization | `No Auth`                             |
| Params        | Không có                              |
| Body          | `none`                                |

### Example request

```http
GET {{baseUrl}}/api/Common/GetGoodsType
```

### Expected response

```json
{
  "Items": [
    {
      "Id": 1,
      "CName": "pack",
      "EName": "WPX"
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

### Response fields

| Field           | Ý nghĩa       |
| --------------- | ------------- |
| `Items[].Id`    | ID loại hàng  |
| `Items[].EName` | Tên tiếng Anh |
| `Items[].CName` | Tên mô tả     |

---

## API 4 — GetPriceTrial

### Chức năng

Tính thử phí vận chuyển theo quốc gia, cân nặng, kích thước và loại hàng.

### Postman

| Vị trí        | Giá trị                                 |
| ------------- | --------------------------------------- |
| Method        | `GET`                                   |
| URL           | `{{baseUrl}}/api/Freight/GetPriceTrial` |
| Authorization | `No Auth`                               |
| Body          | `none`                                  |

### Params

| Key                                 | Required | Value mẫu | Ghi chú                                                    |
| ----------------------------------- | -------- | --------- | ---------------------------------------------------------- |
| `CountryCode`                       | Yes      | `US`      | Mã quốc gia                                                |
| `Weight`                            | Yes      | `0.1`     | Kg, tối đa 3 số thập phân                                  |
| `Length`                            | No       | `20`      | cm, mặc định 1 nếu không truyền                            |
| `Width`                             | No       | `15`      | cm, mặc định 1                                             |
| `Height`                            | No       | `5`       | cm, mặc định 1                                             |
| `PostCode`                          | No       | `93445`   | Zip/postal code                                            |
| `PackageType`                       | Yes      | `0`       | `0` general cargo, `1` with electricity, `2` special goods |
| `ExtraServicesList[0].ExtraService` | No       | `Ls0091`  | Additional service, ví dụ signature service                |

### Example request

```http
GET {{baseUrl}}/api/Freight/GetPriceTrial?CountryCode=US&Weight=0.1&Length=20&Width=15&Height=5&PackageType=0
```

### Expected response

```json
{
  "Items": [
    {
      "Code": "USZXR",
      "CName": "...",
      "EName": "YunExpress US Direct Line",
      "ShippingFee": 2.01,
      "RegistrationFee": 0.0,
      "FuelFee": 0.0,
      "SundryFee": 0.0,
      "TotalFee": 2.01,
      "DeliveryDays": null,
      "Remark": "",
      "Currency": "USD"
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

### Response fields

| Field             | Ý nghĩa                   |
| ----------------- | ------------------------- |
| `Items[].Code`    | Shipping method code      |
| `ShippingFee`     | Cước cơ bản               |
| `RegistrationFee` | Phí đăng ký               |
| `FuelFee`         | Phụ phí nhiên liệu        |
| `TariffPrepayFee` | Phí prepaid tariff nếu có |
| `TotalFee`        | Tổng phí                  |
| `Currency`        | Tiền tệ                   |
| `DeliveryDays`    | Thời gian giao dự kiến    |

---

## API 5 — GetTrackingNumber

### Chức năng

Lấy tracking number theo `CustomerOrderNumber`. API có thể trả trạng thái tracking đang được tạo.

### Postman

| Vị trí        | Giá trị                                     |
| ------------- | ------------------------------------------- |
| Method        | `GET`                                       |
| URL           | `{{baseUrl}}/api/Waybill/GetTrackingNumber` |
| Authorization | `No Auth`                                   |
| Body          | `none`                                      |

### Params

| Key                   | Required | Value mẫu                 | Ghi chú                                         |
| --------------------- | -------- | ------------------------- | ----------------------------------------------- |
| `CustomerOrderNumber` | Yes      | `{{customerOrderNumber}}` | Có thể truyền nhiều mã, phân tách bằng dấu phẩy |

### Example request

```http
GET {{baseUrl}}/api/Waybill/GetTrackingNumber?CustomerOrderNumber={{customerOrderNumber}}
```

### Post-response script mẫu

```javascript
const json = pm.response.json();
console.log("GetTrackingNumber response:", json);

const first = (json.Items || [])[0];
if (first) {
  if (first.CustomerOrderNumber)
    pm.environment.set("customerOrderNumber", first.CustomerOrderNumber);
  if (first.WayBillNumber)
    pm.environment.set("wayBillNumber", first.WayBillNumber);
  if (first.TrackingNumber)
    pm.environment.set("trackingNumber", first.TrackingNumber);
}
```

### Expected response

```json
{
  "Items": [
    {
      "CustomerOrderNumber": "ORDER001",
      "TrackingNumber": "",
      "WayBillNumber": "YT211933101466682",
      "ChildTrackings": [],
      "Remark": "Tracking number is being generated",
      "Status": 2
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully!"
}
```

### Status mapping

| Status | Ý nghĩa                                       |
| -----: | --------------------------------------------- |
|    `1` | Tracking number generated successfully        |
|    `2` | Tracking number is being generated            |
|    `3` | Tracking number does not need to be generated |
|    `4` | Tracking number generation failed             |

---

## API 6 — GetSender

### Chức năng

Query sender information được YunExpress assign cho order.

### Postman

| Vị trí        | Giá trị                             |
| ------------- | ----------------------------------- |
| Method        | `GET`                               |
| URL           | `{{baseUrl}}/api/WayBill/GetSender` |
| Authorization | `No Auth`                           |
| Body          | `none`                              |

### Params

| Key           | Required | Value mẫu           | Ghi chú                                                       |
| ------------- | -------- | ------------------- | ------------------------------------------------------------- |
| `OrderNumber` | Yes      | `{{wayBillNumber}}` | Có thể là waybill number, customer order hoặc tracking number |

### Example request

```http
GET {{baseUrl}}/api/WayBill/GetSender?OrderNumber={{wayBillNumber}}
```

### Expected response

```json
{
  "Items": {
    "OrderNumber": "YT1908821203000021",
    "WayBillNumber": "YT1908821203000021",
    "CountryCode": "US",
    "FirstName": "test",
    "LastName": "ming",
    "Company": "test company",
    "Address": "address street",
    "City": "city",
    "State": "state",
    "Zip": "zip",
    "Phone": ""
  },
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

---

## API 7 — CreateOrder

### Chức năng

Tạo waybill / forecast order. Đây là API chính để gửi đơn hàng sang YunExpress.

### Postman

| Vị trí        | Giá trị                               |
| ------------- | ------------------------------------- |
| Method        | `POST`                                |
| URL           | `{{baseUrl}}/api/WayBill/CreateOrder` |
| Authorization | `No Auth`                             |
| Body          | `raw` → `JSON`                        |

### Body format

Body là **JSON array**, hỗ trợ batch tối đa 10 order/lần.

### Body mẫu tối thiểu cho đơn hàng US

```json
[
  {
    "CustomerOrderNumber": "LNGTEST{{$timestamp}}",
    "ShippingMethodCode": "{{shippingMethodCode}}",
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

### Required fields chính

| Field                    | Required | Ghi chú                                       |
| ------------------------ | -------- | --------------------------------------------- |
| `CustomerOrderNumber`    | Yes      | Không được trùng; nên dùng timestamp khi test |
| `ShippingMethodCode`     | Yes      | Lấy từ GetShippingMethods/GetPriceTrial       |
| `PackageCount`           | Yes      | Số package, integer > 0                       |
| `Weight`                 | Yes      | Tổng cân nặng kg                              |
| `Receiver`               | Yes      | Thông tin người nhận                          |
| `Receiver.CountryCode`   | Yes      | Quốc gia 2 ký tự                              |
| `Receiver.FirstName`     | Yes      | Tên người nhận                                |
| `Receiver.Street`        | Yes      | Địa chỉ                                       |
| `Receiver.City`          | Yes      | Thành phố                                     |
| `Parcels`                | Yes      | Khai báo hàng hóa                             |
| `Parcels[].EName`        | Yes      | Tên hàng tiếng Anh                            |
| `Parcels[].Quantity`     | Yes      | Số lượng                                      |
| `Parcels[].UnitPrice`    | Yes      | Giá khai báo/FOB price                        |
| `Parcels[].UnitWeight`   | Yes      | Cân nặng đơn vị kg                            |
| `Parcels[].CurrencyCode` | Yes      | Ví dụ `USD`, `EUR`, `GBP`                     |

### Lưu ý thực tế

Một số tuyến có rule kiểm tra `CName`. Nếu gặp lỗi kiểu `CName: Required and cannot be pure numbers or letters`, nên dùng tên hàng tiếng Trung, ví dụ:

```json
"CName": "帽子"
```

### Expected response thành công

```json
{
  "Item": [
    {
      "CustomerOrderNumber": "LNGTEST123",
      "Success": 1,
      "TrackType": "2",
      "Remark": "",
      "AgentNumber": null,
      "WayBillNumber": "YT1909231204000001",
      "RequireSenderAddress": 0,
      "TrackingNumber": null,
      "ShipperBoxs": [],
      "RemoteArea": "N"
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

### Response fields

| Field            | Ý nghĩa                                                             |
| ---------------- | ------------------------------------------------------------------- |
| `Success`        | `1` thành công, `0` thất bại                                        |
| `TrackType`      | `1` đã có tracking, `2` chờ update tracking, `3` không cần tracking |
| `WayBillNumber`  | Mã vận đơn YunExpress                                               |
| `TrackingNumber` | Tracking number nếu đã có                                           |
| `RemoteArea`     | `Y` remote area, `N` không remote                                   |
| `Remark`         | Lý do lỗi nếu fail                                                  |

---

## API 8 — GetOrder

### Chức năng

Query thông tin waybill/order. Nên test API này trước khi test tracking để xác nhận order tồn tại.

### Postman

| Vị trí        | Giá trị                            |
| ------------- | ---------------------------------- |
| Method        | `GET`                              |
| URL           | `{{baseUrl}}/api/WayBill/GetOrder` |
| Authorization | `No Auth`                          |
| Body          | `none`                             |

### Params

| Key           | Required | Value mẫu                                          | Ghi chú                                                  |
| ------------- | -------- | -------------------------------------------------- | -------------------------------------------------------- |
| `OrderNumber` | Yes      | `{{customerOrderNumber}}` hoặc `{{wayBillNumber}}` | Có thể dùng customer order, waybill hoặc tracking number |

### Example request

```http
GET {{baseUrl}}/api/WayBill/GetOrder?OrderNumber={{customerOrderNumber}}
```

### Post-response script mẫu

```javascript
const json = pm.response.json();
console.log("GetOrder response:", json);

if (json.Item) {
  if (json.Item.WayBillNumber)
    pm.environment.set("wayBillNumber", json.Item.WayBillNumber);
  if (json.Item.TrackingNumber)
    pm.environment.set("trackingNumber", json.Item.TrackingNumber);
}
```

### Expected response

```json
{
  "Item": {
    "WayBillNumber": "YT1908821203000021",
    "OrderNumber": "test-20190322450110",
    "ShippingMethodCode": "PK0003",
    "TrackingNumber": "",
    "Length": 1,
    "Width": 1,
    "Height": 1,
    "PackageNumber": 1,
    "Weight": 1.0,
    "Status": 5,
    "Receiver": {},
    "Sender": null,
    "Parcels": []
  },
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

### Order status mapping

| Status | Ý nghĩa   |
| -----: | --------- |
|    `0` | Draft     |
|    `3` | Submitted |
|    `4` | Received  |
|    `5` | Shipped   |
|    `6` | Deleted   |
|    `7` | Returned  |
|   `10` | Claimed   |
|   `11` | Signed    |

---

## API 9 — UpdateWeight

### Chức năng

Sửa forecast weight của order. Chỉ hỗ trợ order còn ở trạng thái forecasted.

### Postman

| Vị trí        | Giá trị                                |
| ------------- | -------------------------------------- |
| Method        | `POST`                                 |
| URL           | `{{baseUrl}}/api/WayBill/UpdateWeight` |
| Authorization | `No Auth`                              |
| Body          | `raw` → `JSON`                         |

### Body

```json
{
  "OrderNumber": "{{wayBillNumber}}",
  "Weight": 0.2
}
```

### Body fields

| Field         | Required | Ghi chú                       |
| ------------- | -------- | ----------------------------- |
| `OrderNumber` | Yes      | Order number / waybill number |
| `Weight`      | Yes      | Cân nặng mới                  |

### Expected response

```json
{
  "Item": {
    "OrderNumber": "G2Gapi20190401001",
    "Status": "success",
    "Remark": "Processed successfully"
  },
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

---

## API 10 — Delete

### Chức năng

Xóa order/waybill. Chỉ hỗ trợ draft và forecasted waybill.

### Postman

| Vị trí        | Giá trị                          |
| ------------- | -------------------------------- |
| Method        | `POST`                           |
| URL           | `{{baseUrl}}/api/WayBill/Delete` |
| Authorization | `No Auth`                        |
| Body          | `raw` → `JSON`                   |

### Body

```json
{
  "OrderType": 1,
  "OrderNumber": "{{wayBillNumber}}"
}
```

### Body fields

| Field         | Required | Ghi chú                                                                             |
| ------------- | -------- | ----------------------------------------------------------------------------------- |
| `OrderType`   | Yes      | `1` YunExpress order/waybill number, `2` customer order number, `3` tracking number |
| `OrderNumber` | Yes      | Mã cần xóa                                                                          |

### Expected response

```json
{
  "Item": {
    "OrderNumber": "YT1908621203000037",
    "Status": "5012",
    "Type": 1,
    "Remark": "successfully deleted"
  },
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

---

## API 11 — Intercept

### Chức năng

Chặn/intercept order. Chỉ hỗ trợ forecasted và warehoused waybills.

### Postman

| Vị trí        | Giá trị                             |
| ------------- | ----------------------------------- |
| Method        | `POST`                              |
| URL           | `{{baseUrl}}/api/WayBill/Intercept` |
| Authorization | `No Auth`                           |
| Body          | `raw` → `JSON`                      |

### Body

```json
{
  "OrderType": 1,
  "OrderNumber": "{{wayBillNumber}}",
  "Remark": "Customer requested interception"
}
```

### Body fields

| Field         | Required | Ghi chú                                                            |
| ------------- | -------- | ------------------------------------------------------------------ |
| `OrderType`   | Yes      | `1` waybill number, `2` customer order number, `3` tracking number |
| `OrderNumber` | Yes      | Mã order                                                           |
| `Remark`      | Yes      | Lý do intercept                                                    |

### Expected response

```json
{
  "Item": {
    "OrderNumber": "YT1908411202000003",
    "Result": "5011",
    "Type": 1,
    "Remark": "Successful interception!"
  },
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

---

## API 12 — Label Print

### Chức năng

Lấy link in label PDF.

### Postman

| Vị trí        | Giá trị                       |
| ------------- | ----------------------------- |
| Method        | `POST`                        |
| URL           | `{{baseUrl}}/api/Label/Print` |
| Authorization | `No Auth`                     |
| Params        | Không có                      |
| Body          | `raw` → `JSON`                |

### Body format

Body là **JSON array trực tiếp**, không phải object.

```json
["{{wayBillNumber}}"]
```

### Body nhiều label

```json
["YTxxxxxxxx1", "YTxxxxxxxx2"]
```

### Expected response

```json
{
  "Item": [
    {
      "Url": "http://xxxx.com/label.pdf",
      "OrderInfos": [
        {
          "CustomerOrderNumber": "YT1907911202000015",
          "Error": "Print successfully",
          "Code": 100
        }
      ]
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

### Response fields

| Field                     | Ý nghĩa                      |
| ------------------------- | ---------------------------- |
| `Item[].Url`              | Link PDF label               |
| `OrderInfos[].Code = 100` | In thành công                |
| `OrderInfos[].Code = 200` | Print template không tồn tại |

---

## API 13 — GetShippingFeeDetail

### Chức năng

Query chi tiết phí vận chuyển thực tế theo waybill number.

### Postman

| Vị trí        | Giá trị                                        |
| ------------- | ---------------------------------------------- |
| Method        | `GET`                                          |
| URL           | `{{baseUrl}}/api/Freight/GetShippingFeeDetail` |
| Authorization | `No Auth`                                      |
| Body          | `none`                                         |

### Params

| Key             | Required | Value mẫu           |
| --------------- | -------- | ------------------- |
| `wayBillNumber` | Yes      | `{{wayBillNumber}}` |

### Example request

```http
GET {{baseUrl}}/api/Freight/GetShippingFeeDetail?wayBillNumber={{wayBillNumber}}
```

### Expected response

```json
{
  "Item": {
    "ShippingMethodName": "British special line standard",
    "CountryCode": "GB",
    "CustomerOrderNumber": "201903251700",
    "WayBillNumber": "YT1908421201000005",
    "TrackingNumber": "...",
    "GrossWeight": 1.0,
    "ChargeWeight": 1.0,
    "Freight": 0.18,
    "FuelSurcharge": 0.0,
    "RegistrationFee": 0.0,
    "ProcessingFee": 0.0,
    "OtherFee": 0.0,
    "TotalFee": 0.18,
    "OccurrenceTime": "2019/3/25 16:11:58"
  },
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

---

## API 14 — Register

### Chức năng

Đăng ký user/customer. Trong thực tế thường không cần dùng nếu YunExpress đã cấp customer account/API credentials.

### Postman

| Vị trí        | Giá trị                                                      |
| ------------- | ------------------------------------------------------------ |
| Method        | `GET` theo tài liệu                                          |
| URL           | `{{baseUrl}}/api/Common/Register`                            |
| Authorization | `No Auth`                                                    |
| Body          | Theo môi trường thực tế; tài liệu mô tả nhiều field required |

### Request fields

| Field       | Required | Ghi chú               |
| ----------- | -------- | --------------------- |
| `UserName`  | Yes      | Username              |
| `PassWord`  | Yes      | Password              |
| `Contact`   | Yes      | Contact person        |
| `Mobile`    | Yes      | Mobile phone          |
| `Telephone` | Yes      | Telephone             |
| `Name`      | Yes      | Customer/company name |
| `Email`     | Yes      | Email                 |
| `Address`   | Yes      | Address               |
| `PlatForm`  | Yes      | Platform ID           |

### Body/Params mẫu tham khảo

```json
{
  "UserName": "test126",
  "PassWord": "123456",
  "Contact": "Lao Zhang",
  "Telephone": "123456",
  "Mobile": "19988888888",
  "Name": "Test Company",
  "Email": "test@example.com",
  "Address": "Test address",
  "PlatForm": 1
}
```

### Expected response

```json
{
  "Item": {
    "CustomerCode": "C12345",
    "AccountID": "tongtu011",
    "ApiSecret": "SIpDkN10x9b="
  },
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

### Lưu ý

Phần này trong tài liệu có điểm không thống nhất: method ghi `GET`, nhưng lại có nhiều field đăng ký. Khi cần test thật, nên xác nhận với YunExpress business/support xem server nhận data qua query params hay JSON body.

---

## API 15 — GetTrackInfo

### Chức năng

Query tracking timeline theo track subscription. Đây là API dùng để sync trạng thái shipment định kỳ.

### Postman

| Vị trí        | Giá trị                                 |
| ------------- | --------------------------------------- |
| Method        | `GET`                                   |
| URL           | `{{baseUrl}}/api/Tracking/GetTrackInfo` |
| Authorization | `No Auth`                               |
| Body          | `none`                                  |

### Params

| Key           | Required | Value mẫu           | Ghi chú                                                       |
| ------------- | -------- | ------------------- | ------------------------------------------------------------- |
| `OrderNumber` | Yes      | `{{wayBillNumber}}` | Có thể là waybill number, customer order hoặc tracking number |

### Example request

```http
GET {{baseUrl}}/api/Tracking/GetTrackInfo?OrderNumber={{wayBillNumber}}
```

### Post-response script mẫu

```javascript
const json = pm.response.json();
console.log("GetTrackInfo response:", json);

const item = json.Item;
if (item) {
  if (item.WayBillNumber)
    pm.environment.set("wayBillNumber", item.WayBillNumber);
  if (item.TrackingNumber)
    pm.environment.set("trackingNumber", item.TrackingNumber);
}
```

### Expected response

```json
{
  "Item": {
    "CountryCode": "DE",
    "WayBillNumber": "YT2207711010000002",
    "TrackingNumber": "",
    "ProviderName": null,
    "ProviderTelephone": null,
    "ProviderSite": null,
    "POD": null,
    "PODs": [],
    "PackageState": 1,
    "TrackingStatus": 10,
    "OrderTrackingDetails": [
      {
        "TrackingStatus": 10,
        "ProcessContent": "Shipment information received",
        "ProcessDate": "2022-03-18T16:48:44",
        "ProcessLocation": null,
        "ProcessCountry": "",
        "ProcessProvince": "",
        "ProcessCity": "",
        "AbnormalReasons": []
      }
    ]
  },
  "Message": "Submitted successfully!",
  "Code": "0000"
}
```

### PackageState mapping

| PackageState | Ý nghĩa         |
| -----------: | --------------- |
|          `0` | Unknown         |
|          `1` | Submitted       |
|          `2` | In transit      |
|          `3` | Signed          |
|          `4` | Received        |
|          `5` | Order canceled  |
|          `6` | Delivery failed |
|          `7` | Returned        |

### TrackingStatus mapping

| TrackingStatus | Ý nghĩa                                  |
| -------------: | ---------------------------------------- |
|            `0` | Not found                                |
|           `10` | Electronic forecast information received |
|           `20` | In transit                               |
|           `30` | Arrived for pickup                       |
|           `40` | Delivery failed                          |
|           `50` | Received / Delivered                     |
|           `60` | Abnormal                                 |
|           `80` | Unknown                                  |
|           `90` | Returned                                 |
|          `100` | Cancelled                                |

### Tracking detail fields

| Field                  | Ý nghĩa                           |
| ---------------------- | --------------------------------- |
| `ProcessDate`          | Thời gian phát sinh tracking node |
| `ProcessContent`       | Nội dung tracking                 |
| `ProcessLocation`      | Địa điểm tracking                 |
| `TrackNodeCode`        | Mã node tracking                  |
| `TrackCodeDescription` | Mô tả node tracking               |
| `ProcessCountry`       | Quốc gia phát sinh tracking       |
| `ProcessProvince`      | Tỉnh/bang                         |
| `ProcessCity`          | Thành phố                         |
| `AbnormalReasons`      | Lý do bất thường nếu có           |
| `ProcessTimezone`      | Time zone của tracking time       |

---

## API 16 — GetTrackAllInfo

### Chức năng

Query toàn bộ tracking history. Dùng khi cần debug hoặc cần full timeline.

### Postman

| Vị trí        | Giá trị                                    |
| ------------- | ------------------------------------------ |
| Method        | `GET`                                      |
| URL           | `{{baseUrl}}/api/Tracking/GetTrackAllInfo` |
| Authorization | `No Auth`                                  |
| Body          | `none`                                     |

### Params

| Key           | Required | Value mẫu           |
| ------------- | -------- | ------------------- |
| `OrderNumber` | Yes      | `{{wayBillNumber}}` |

### Example request

```http
GET {{baseUrl}}/api/Tracking/GetTrackAllInfo?OrderNumber={{wayBillNumber}}
```

### Expected response

Response format gần giống `GetTrackInfo`, nhưng thường trả nhiều hơn trong `OrderTrackingDetails`.

```json
{
  "Item": {
    "CountryCode": "US",
    "WayBillNumber": "YT2613200100357681",
    "TrackingNumber": "9214490409333713969907",
    "CarrierName": "USPS",
    "CreatedBy": null,
    "PackageState": 2,
    "TrackingStatus": 20,
    "IntervalDays": 0.0,
    "ProviderName": "USPS",
    "ProviderTelephone": "1-800-275-8777",
    "ProviderSite": "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=9214490409333713969907",
    "POD": "",
    "PODs": null,
    "OrderTrackingDetails": [
      {
        "ProcessContent": "Shipment information received",
        "ProcessLocation": "",
        "ProcessDate": "2026-05-12T11:04:19",
        "ProcessTimezone": "UTC+08:00",
        "TrackingStatus": 10,
        "AirportCode": "",
        "TrackNodeCode": "ORDER_CREATION",
        "TrackCodeDescription": "Order created",
        "ProcessCountry": "",
        "ProcessProvince": "",
        "ProcessCity": "",
        "AbnormalReasons": null
      },
      {
        "ProcessContent": "Arrived at origin facility",
        "ProcessLocation": "HANOI, HANOI, VN",
        "ProcessDate": "2026-05-12T15:56:56",
        "ProcessTimezone": "UTC+07:00",
        "TrackingStatus": 20,
        "AirportCode": "",
        "TrackNodeCode": "FIRST_MILE_ARRIVE",
        "TrackCodeDescription": "Arrival scan",
        "ProcessCountry": "VN",
        "ProcessProvince": "HANOI",
        "ProcessCity": "HANOI",
        "AbnormalReasons": null
      },
      {
        "ProcessContent": "Departed from sort facility",
        "ProcessLocation": "HANOI, HANOI, VN",
        "ProcessDate": "2026-05-12T18:24:47",
        "ProcessTimezone": "UTC+07:00",
        "TrackingStatus": 20,
        "AirportCode": "",
        "TrackNodeCode": "FIRST_MILE_DEPART",
        "TrackCodeDescription": "Departure scan",
        "ProcessCountry": "VN",
        "ProcessProvince": "HANOI",
        "ProcessCity": "HANOI",
        "AbnormalReasons": null
      },
      {
        "ProcessContent": "Shipment is in transit to next facility",
        "ProcessLocation": "HANOI, HANOI, VN",
        "ProcessDate": "2026-05-12T19:04:08",
        "ProcessTimezone": "UTC+07:00",
        "TrackingStatus": 20,
        "AirportCode": "",
        "TrackNodeCode": "DEPART_CONFIRM_OC",
        "TrackCodeDescription": "Left origin hub",
        "ProcessCountry": "VN",
        "ProcessProvince": "HANOI",
        "ProcessCity": "HANOI",
        "AbnormalReasons": null
      },
      {
        "ProcessContent": "Arrived at the origin international airport",
        "ProcessLocation": "HANOI, HANOI, VN",
        "ProcessDate": "2026-05-12T21:04:08",
        "ProcessTimezone": "UTC+08:00",
        "TrackingStatus": 20,
        "AirportCode": "",
        "TrackNodeCode": "ARRIVE_CONFIRM_OC",
        "TrackCodeDescription": "Arrived at the origin international airport",
        "ProcessCountry": "VN",
        "ProcessProvince": "HANOI",
        "ProcessCity": "HANOI",
        "AbnormalReasons": null
      },
      {
        "ProcessContent": "Picked Up By Shipping Partner, USPS Awaiting Item",
        "ProcessLocation": "FRANKLIN PARK, IL 60131",
        "ProcessDate": "2026-05-12T14:35:09",
        "ProcessTimezone": "UTC-05:00",
        "TrackingStatus": 20,
        "AirportCode": "",
        "TrackNodeCode": "PRE_INFO",
        "TrackCodeDescription": "Pre Ascan",
        "ProcessCountry": "US",
        "ProcessProvince": "IL",
        "ProcessCity": "FRANKLIN PARK",
        "AbnormalReasons": null
      }
    ]
  },
  "Code": "0000",
  "Message": "Submission succeeded!",
  "RequestId": "2ef01bec2ef14f32af0aadadc59f1d82",
  "TimeStamp": "2026-05-13T11:18:38.7394172+00:00"
}
```

---

## API 17 — GetCarrier

### Chức năng

Query last-mile delivery service provider: carrier code, carrier name, phone, website.

### Postman

| Vị trí        | Giá trị                              |
| ------------- | ------------------------------------ |
| Method        | `POST`                               |
| URL           | `{{baseUrl}}/api/Waybill/GetCarrier` |
| Authorization | `No Auth`                            |
| Params        | Không có                             |
| Body          | `raw` → `JSON`                       |

### Body đúng khi test thực tế

Body là **JSON array trực tiếp**:

```json
["{{wayBillNumber}}"]
```

Ví dụ hardcode:

```json
["YT2613200100357681"]
```

### Body nhiều mã

```json
["YT2613200100357681", "YTxxxxxxxxxxxxxxx2"]
```

### Không dùng body object

Không dùng dạng này vì server có thể báo `1034 Parameter error, order number cannot be empty`:

```json
{
  "OrderNumbers": ["YT2613200100357681"]
}
```

### Expected response

```json
{
  "Item": [
    {
      "OrderCode": "YT2114422114000001",
      "OrderCodeType": "Y",
      "CarrierCode": "ODERBY03",
      "CarrierCName": "Bye bye 33333",
      "CarrierEName": "ODERBY3",
      "CarrierPhone": "",
      "CarrierWebsite": ""
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

### Response fields

| Field            | Ý nghĩa                                                     |
| ---------------- | ----------------------------------------------------------- |
| `OrderCode`      | Mã đã query                                                 |
| `OrderCodeType`  | `C` customer order, `Y` waybill number, `T` tracking number |
| `CarrierCode`    | Mã carrier chặng cuối                                       |
| `CarrierCName`   | Tên carrier tiếng Trung                                     |
| `CarrierEName`   | Tên carrier tiếng Anh                                       |
| `CarrierPhone`   | Số điện thoại carrier                                       |
| `CarrierWebsite` | Website carrier                                             |

---

## API 18 — RegisterIoss

### Chức năng

Filing/đăng ký IOSS number với YunExpress, nhận về YunExpress IOSS filing identification code.

### Postman

| Vị trí        | Giá trị                                |
| ------------- | -------------------------------------- |
| Method        | `POST`                                 |
| URL           | `{{baseUrl}}/api/WayBill/RegisterIoss` |
| Authorization | `No Auth`                              |
| Body          | `raw` → `JSON`                         |

### Body

```json
{
  "IossType": "1",
  "PlatformName": "Amazon",
  "IossNumber": "XY1234567890",
  "Company": "test",
  "Country": "CN",
  "Street": "long dong road 3000",
  "City": "shen zhen",
  "Province": "guang dong",
  "PostalCode": "20000",
  "MobilePhone": "1234567890",
  "Email": "test@example.com",
  "FileUrl": ["https://example.com/ioss-file.pdf"]
}
```

### Body fields

| Field                                      | Required           | Ghi chú                                                       |
| ------------------------------------------ | ------------------ | ------------------------------------------------------------- |
| `IossType`                                 | Yes                | `0` personal, `1` platform                                    |
| `PlatformName`                             | Khi `IossType = 1` | Ví dụ Amazon                                                  |
| `IossNumber`                               | Yes                | 2 letters + 10 digits, regex `^[a-zA-Z]{2}[0-9]{10}$`         |
| `Company`                                  | No                 | Công ty đăng ký IOSS                                          |
| `Country`                                  | No                 | Country code                                                  |
| `Street`, `City`, `Province`, `PostalCode` | No                 | Địa chỉ                                                       |
| `MobilePhone`, `Email`                     | No                 | Contact                                                       |
| `FileUrl`                                  | No/conditional     | Tối đa 5 file URL; cần khi IOSS chưa approved hoặc cần modify |

### Expected response

```json
{
  "IossCode": "IOSS211671748040626133798",
  "IossStatus": "3",
  "IossNote": "New IOSS number filing, please wait for review",
  "Code": "0000",
  "Message": "Successfully filed"
}
```

### IOSS status

| IossStatus | Ý nghĩa        |
| ---------- | -------------- |
| `1`        | Passed         |
| `3`        | Pending review |

---

## API 19 — DisableIoss

### Chức năng

Vô hiệu hóa IOSS number filing.

### Postman

| Vị trí        | Giá trị                               |
| ------------- | ------------------------------------- |
| Method        | `POST`                                |
| URL           | `{{baseUrl}}/api/WayBill/DisableIoss` |
| Authorization | `No Auth`                             |
| Body          | `raw` → `JSON`                        |

### Body

```json
{
  "code": "IOSS231380908071723203831"
}
```

### Body fields

| Field  | Required | Ghi chú                                    |
| ------ | -------- | ------------------------------------------ |
| `code` | Yes      | Identification code trả về từ RegisterIoss |

### Expected response

```json
{
  "Item": true,
  "Code": "0000",
  "Message": "Successfully submitted!"
}
```

---

## API 20 — CreateOrderLabel

### Chức năng

Tạo waybill và lấy label trong cùng request.

### Postman

| Vị trí        | Giá trị                                    |
| ------------- | ------------------------------------------ |
| Method        | `POST`                                     |
| URL           | `{{baseUrl}}/api/WayBill/CreateOrderLabel` |
| Authorization | `No Auth`                                  |
| Body          | `raw` → `JSON`                             |

### Body format

Body là **JSON array order objects**, gần giống `CreateOrder`. Hỗ trợ batch tối đa 10 order/lần.

### Body mẫu

```json
[
  {
    "CustomerOrderNumber": "LNGTEST{{$timestamp}}",
    "ShippingMethodCode": "{{shippingMethodCode}}",
    "TrackingNumber": null,
    "TransactionNumber": null,
    "SizeUnits": "cm",
    "Height": 5,
    "Length": 20,
    "Width": 15,
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
        "CurrencyCode": "USD"
      }
    ]
  }
]
```

### Expected response

```json
{
  "Item": [
    {
      "Label": {
        "Url": "http://xxxx.com/test/label.pdf",
        "LabelType": "pdf",
        "LabelString": "",
        "OrderInfos": [
          {
            "CustomerOrderNumber": "YTxxxxx",
            "Error": "",
            "Code": 100
          }
        ]
      },
      "CustomerOrderNumber": "xxxxxx",
      "Success": 1,
      "TrackType": "1",
      "Remark": "",
      "RequireSenderAddress": 0,
      "AgentNumber": "",
      "WayBillNumber": "YTxxxxxx",
      "TrackingNumber": "test000000305857",
      "ShipperBoxs": [],
      "RemoteArea": "N"
    }
  ],
  "Code": "0000",
  "Message": ""
}
```

---

## API 21 — SelfPickupPoint

### Chức năng

Lấy danh sách điểm tự nhận hàng theo địa chỉ, quốc gia, product code và cân nặng.

### Postman

| Vị trí        | Giá trị                                  |
| ------------- | ---------------------------------------- |
| Method        | `POST`                                   |
| URL           | `{{baseUrl}}/api/common/SelfPickupPoint` |
| Authorization | `No Auth`                                |
| Body          | `raw` → `JSON`                           |

### Body

```json
{
  "ProductCode": "TESTZT01",
  "Weight": 1,
  "CountryCode": "AT",
  "Province": "",
  "City": "Wien",
  "PostalCode": "1030",
  "Address": "Rochusplatz 1",
  "Address2": "",
  "Address3": "",
  "PointNumber": 10,
  "SearchRadius": 3
}
```

### Body fields

| Field                  | Required | Ghi chú                                          |
| ---------------------- | -------- | ------------------------------------------------ |
| `CountryCode`          | Yes      | Country code                                     |
| `City`                 | Yes      | City                                             |
| `Address`              | Yes      | Address                                          |
| `ProductCode`          | Yes      | Product code/shipping method code                |
| `Weight`               | Yes      | Weight                                           |
| `Province`             | No       | Province/state                                   |
| `PostalCode`           | No       | Postal code                                      |
| `Address2`, `Address3` | No       | Additional address                               |
| `PointNumber`          | No       | Số điểm cần lấy, mặc định 20                     |
| `SearchRadius`         | No       | Bán kính km, mặc định 3                          |
| `LatLng`               | No       | Dùng latitude/longitude thay cho address nếu cần |

### Expected response

```json
{
  "Item": [
    {
      "PointRelaisCountryCode": "AT",
      "PointRelaisNum": "7B0AF1763B3D...",
      "PointRelaisName": "Abholstation A 1006 Wien",
      "PointRelaisType": "2",
      "PointRelaisAddress": "Rochusplatz 1",
      "PointRelaisPostalCode": "1030",
      "PointRelaisCity": "Wien",
      "PointRelaisProvinceCode": "s",
      "PointRelaisDistance": 0.017,
      "LatLng": {
        "Latitude": "48.20277754",
        "Longitude": "16.39140441"
      },
      "OpeningHours": [
        {
          "Opens": "00:00",
          "Closes": "23:59",
          "DayOfWeek": 0
        }
      ],
      "RestHours": [],
      "Phone": "1008611"
    }
  ],
  "Code": "0000",
  "Message": "Submitted successfully"
}
```

---

# 4. Bảng mã lỗi thường gặp

|    Code | Ý nghĩa                                               | Cách xử lý                                                             |
| ------: | ----------------------------------------------------- | ---------------------------------------------------------------------- |
|  `0000` | Submitted successfully                                | Request xử lý thành công                                               |
|  `1001` | Submission Failed                                     | Xem `Message`/`Remark` chi tiết                                        |
|  `1002` | Interface ApiKey or ApiSecret error                   | Kiểm tra `customerNo`, `apiSecret`, token Base64                       |
|  `1003` | Signature error                                       | Kiểm tra Authorization header                                          |
|  `1004` | Parameter error                                       | Kiểm tra Params/Body JSON, field required                              |
|  `1005` | Wrong phone number                                    | Kiểm tra format phone                                                  |
|  `1006` | Data not found                                        | Sai mã hoặc dữ liệu chưa có                                            |
|  `1011` | Partial success                                       | Một phần batch thành công                                              |
|  `1034` | Parameter error, order number cannot be empty         | Với `GetCarrier`, body phải là JSON array trực tiếp, ví dụ `["YT..."]` |
|  `2001` | Date format is wrong                                  | Sửa format ngày                                                        |
|  `2002` | Length exceeds limit                                  | Field vượt độ dài                                                      |
|  `2003` | Customer ID does not exist                            | Sai customer/account                                                   |
|  `2004` | Duplicate order number                                | Đổi `CustomerOrderNumber`                                              |
|  `2005` | Order number already exists                           | Đổi mã order                                                           |
|  `2006` | No tracking number available for this shipping method | Tuyến không có tracking                                                |
|  `2007` | Tracking number already exists                        | Tracking đã tồn tại                                                    |
|  `2008` | Tariff prepayment authority not opened                | Liên hệ YunExpress mở quyền tariff prepaid                             |
|  `2009` | Weight must be greater than zero                      | `Weight` phải > 0                                                      |
|  `2010` | Shipping method does not ship to this country         | Đổi tuyến hoặc country                                                 |
|  `2011` | Incorrect declaration remarks                         | Sửa khai báo hàng hóa                                                  |
|  `2012` | Incorrect recipient phone                             | Sửa phone người nhận                                                   |
|  `2013` | Order number can only consist of numbers and letters  | Không dùng ký tự đặc biệt trong order number                           |
|  `5001` | Processed successfully                                | Thành công trong nhóm thao tác delete/intercept                        |
|  `5002` | Order number type does not exist                      | Sai `OrderType`                                                        |
|  `5003` | Track number cannot be empty                          | Thiếu tracking number                                                  |
|  `5004` | Tracking/order number does not exist                  | Sai mã hoặc chưa có dữ liệu                                            |
|  `5005` | Order does not exist                                  | Đơn không tồn tại                                                      |
|  `5006` | Interception reason cannot be empty                   | Thiếu `Remark` khi intercept                                           |
|  `5007` | Order is not submitted or received                    | Không thể intercept ở trạng thái hiện tại                              |
|  `5008` | Order is not submitted                                | Order chưa submitted                                                   |
|  `5009` | Interception failed                                   | Thử lại hoặc liên hệ YunExpress                                        |
|  `5010` | Deletion failed                                       | Thử lại hoặc kiểm tra trạng thái order                                 |
|  `5011` | Successful interception                               | Intercept thành công                                                   |
|  `5012` | Successfully deleted                                  | Xóa thành công                                                         |
|  `5099` | Processing failed                                     | Thử lại hoặc liên hệ YunExpress                                        |
|  `9999` | Platform exception                                    | Lỗi hệ thống YunExpress                                                |
| `10000` | Request exceeded                                      | Quá giới hạn request                                                   |

---

# 5. Dangerous Goods Code List

|  Code | Description                                                      |
| ----: | ---------------------------------------------------------------- |
| `810` | HAZMAT Air Eligible Ethanol Package                              |
| `811` | HAZMAT Class 1 - Toy Propellant/Safety Fuse Package              |
| `812` | HAZMAT Class 3 - Flammable Liquid Package                        |
| `813` | HAZMAT Class 7 - Radioactive Materials Package                   |
| `814` | HAZMAT Class 8 - Corrosive Materials Package                     |
| `815` | HAZMAT Class 8 - Nonspillable Wet Battery Package                |
| `816` | HAZMAT Class 9 - Lithium Battery Marked - Ground Only Package    |
| `817` | HAZMAT Class 9 - Lithium Battery - Returns Package               |
| `818` | HAZMAT Class 9 - Lithium batteries, marked package               |
| `819` | HAZMAT Class 9 - Dry Ice Package                                 |
| `820` | HAZMAT Class 9 - Lithium batteries, unmarked package             |
| `821` | HAZMAT Class 9 - Magnetized Materials Package                    |
| `822` | HAZMAT Division 4.1 - Flammable Solids or Safety Matches Package |
| `823` | HAZMAT Division 5.1 - Oxidizers Package                          |
| `824` | HAZMAT Division 5.2 - Organic Peroxides Package                  |
| `825` | HAZMAT Division 6.1 - Toxic Materials Package                    |
| `826` | HAZMAT Division 6.2 - Infectious Substances Package              |
| `827` | HAZMAT Excepted Quantity Provision Package                       |
| `828` | HAZMAT Ground Only                                               |
| `829` | HAZMAT ID8000 Consumer Commodity Package                         |
| `830` | HAZMAT Lighters Package                                          |
| `831` | HAZMAT LTD QTY Ground Package                                    |
| `832` | HAZMAT Small Quantity Provision Package                          |

---

# 6. Ghi chú kỹ thuật quan trọng

## 6.1 Case-sensitive endpoint

Một số endpoint trong tài liệu dùng `WayBill`, một số dùng `Waybill`. Khi test, nên copy đúng path:

```text
/api/WayBill/CreateOrder
/api/WayBill/GetOrder
/api/Waybill/GetTrackingNumber
/api/Waybill/GetCarrier
```

Nếu server trả `404`, kiểm tra lại chữ hoa/thường và `baseUrl` có bị dư `/api` không.

## 6.2 Body array trực tiếp

Các API sau nên dùng JSON array trực tiếp:

```text
POST /api/Label/Print
POST /api/Waybill/GetCarrier
```

Ví dụ:

```json
["YT2613200100357681"]
```

Không dùng object wrapper nếu server báo `order number cannot be empty`.

## 6.3 Code `0000` không luôn đồng nghĩa nghiệp vụ thành công

`Code = "0000"` nghĩa là API nhận/xử lý request thành công. Với các API nghiệp vụ, vẫn cần đọc thêm:

| API                 | Field cần đọc thêm                                       |
| ------------------- | -------------------------------------------------------- |
| `CreateOrder`       | `Item[].Success`, `Item[].Remark`                        |
| `GetTrackingNumber` | `Items[].Status`, `Items[].Remark`                       |
| `GetTrackInfo`      | `TrackingStatus`, `PackageState`, `OrderTrackingDetails` |
| `Delete`            | `Item.Status`, `Item.Remark`                             |
| `Intercept`         | `Item.Result`, `Item.Remark`                             |

## 6.4 Tracking polling

Tracking number có thể chưa có ngay sau khi tạo waybill. Nếu `GetTrackingNumber` trả:

```json
"Status": 2
```

nghĩa là tracking đang được tạo. Có thể dùng `WayBillNumber` để query `GetTrackInfo`, nhưng timeline có thể mới ở trạng thái electronic forecast.

---

# 7. Postman scripts tiện ích

## 7.1 Script kiểm tra response chung

Dán vào `Scripts → Post-response` nếu muốn check nhanh:

```javascript
pm.test("HTTP status is 200", function () {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
console.log("YunExpress response:", json);

pm.test("Has YunExpress Code", function () {
  pm.expect(json).to.have.property("Code");
});
```

## 7.2 Script lưu waybill/tracking từ GetOrder

```javascript
const json = pm.response.json();

if (json.Item) {
  if (json.Item.WayBillNumber) {
    pm.environment.set("wayBillNumber", json.Item.WayBillNumber);
  }

  if (json.Item.TrackingNumber) {
    pm.environment.set("trackingNumber", json.Item.TrackingNumber);
  }
}
```

## 7.3 Script lưu waybill/tracking từ GetTrackingNumber

```javascript
const json = pm.response.json();
const first = (json.Items || [])[0];

if (first) {
  if (first.CustomerOrderNumber) {
    pm.environment.set("customerOrderNumber", first.CustomerOrderNumber);
  }

  if (first.WayBillNumber) {
    pm.environment.set("wayBillNumber", first.WayBillNumber);
  }

  if (first.TrackingNumber) {
    pm.environment.set("trackingNumber", first.TrackingNumber);
  }

  console.log("Tracking status:", first.Status, first.Remark);
}
```

## 7.4 Script chọn carrierOrderNumber

Dùng cho `GetCarrier` nếu muốn ưu tiên `wayBillNumber`, rồi đến `trackingNumber`, rồi đến `customerOrderNumber`.

```javascript
const wayBillNumber = (pm.environment.get("wayBillNumber") || "").trim();
const trackingNumber = (pm.environment.get("trackingNumber") || "").trim();
const customerOrderNumber = (
  pm.environment.get("customerOrderNumber") || ""
).trim();

const carrierOrderNumber =
  wayBillNumber || trackingNumber || customerOrderNumber;

if (!carrierOrderNumber) {
  throw new Error(
    "Missing carrierOrderNumber: wayBillNumber, trackingNumber, and customerOrderNumber are all empty",
  );
}

pm.environment.set("carrierOrderNumber", carrierOrderNumber);
console.log("Using carrierOrderNumber:", carrierOrderNumber);
```

Sau đó body `GetCarrier` dùng:

```json
["{{carrierOrderNumber}}"]
```
