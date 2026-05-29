export interface YunLookupResponse {
  searchCode: string;
  labelCode?: string;
  getOrder: {
    found: boolean;
    code: string;
    message: string;
    item?: YunOrderItem;
  };
  label?: {
    attempted: boolean;
    code?: string;
    message?: string;
    labelType?: string;
    hasUrl: boolean;
    orderInfos?: YunOrderInfo[];
  };
}

export interface YunOrderItem {
  OrderNumber?: string;
  CustomerOrderNumber?: string;
  WayBillNumber?: string;
  TrackingNumber?: string;
  ShippingMethodCode?: string;
  Status?: string;
  PackageCount?: number;
  PackageNumber?: number;
  Length?: number;
  Width?: number;
  Height?: number;
  Weight?: number;
  Receiver?: YunContact;
  Sender?: YunContact;
  Parcels?: YunParcel[];
  OrderInfos?: YunOrderInfo[];
}

export interface YunContact {
  FirstName?: string;
  LastName?: string;
  Company?: string;
  CountryCode?: string;
  Street?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Phone?: string;
  Email?: string;
}

export interface YunParcel {
  SKU?: string;
  EName?: string;
  CName?: string;
  Quantity?: number;
  UnitPrice?: number;
  UnitWeight?: number;
  CurrencyCode?: string;
  Remark?: string;
}

export interface YunOrderInfo {
  CustomerOrderNumber?: string;
  Code?: string;
  Message?: string;
}

export type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: YunLookupResponse }
  | { status: "not_found"; data: YunLookupResponse }
  | { status: "error"; message: string };
