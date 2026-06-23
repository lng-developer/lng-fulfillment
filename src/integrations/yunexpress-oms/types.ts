export type YunExpressCreateOrderLabelPayload = {
  CustomerOrderNumber: string;
  ShippingMethodCode: string;
  TrackingNumber: string | null;
  TransactionNumber: string | null;
  SizeUnits: string;
  Length: number;
  Width: number;
  Height: number;
  PackageCount: number;
  Weight: number;
  ApplicationType: number;
  ReturnOption: number;
  TariffPrepay: number;
  InsuranceOption: number;
  SourceCode: string;
  Receiver: {
    CountryCode?: string;
    FirstName: string;
    LastName?: string;
    Company?: string;
    Street?: string;
    City?: string;
    State?: string;
    Zip?: string;
    Phone?: string;
    Email?: string;
  };
  Parcels: YunExpressParcel[];
};

export type YunExpressParcel = {
  SKU?: string;
  CName: string;
  EName: string;
  HSCode: string | null;
  Quantity: number;
  UnitPrice: number;
  UnitWeight: number;
  Remark?: string;
  CurrencyCode: string;
  InvoicePart?: string;
  InvoiceUsage?: string;
};

export type YunExpressCreateOrderLabelResponse = {
  Code?: string;
  Message?: string;
  Item?: YunExpressCreateOrderLabelResponseItem[];
};

export type YunExpressCreateOrderLabelResponseItem = {
  CustomerOrderNumber?: string;
  Success?: number | string | boolean;
  TrackType?: string;
  WayBillNumber?: string;
  TrackingNumber?: string;
  Label?: {
    Url?: string;
    LabelType?: string;
    LabelString?: string;
    OrderInfos?: Array<{
      CustomerOrderNumber?: string;
      Error?: string;
      Code?: number | string;
    }>;
  };
  Remark?: string;
};

export type YunExpressGetTrackingNumberResponse = {
  Code?: string;
  Message?: string;
  Items?: YunExpressTrackingNumberItem[];
};

export type YunExpressGetOrderResponse = {
  Code?: string;
  Message?: string;
  Item?: YunExpressOrderItem | null;
};

export type YunExpressOrderItem = {
  OrderNumber?: string | null;
  CustomerOrderNumber?: string | null;
  WayBillNumber?: string | null;
  TrackingNumber?: string | null;
  ShippingMethodCode?: string | null;
  Status?: string | number | null;
  PackageNumber?: string | number | null;
  PackageCount?: string | number | null;
  Length?: string | number | null;
  Width?: string | number | null;
  Height?: string | number | null;
  Weight?: string | number | null;
  Receiver?: unknown;
  Sender?: unknown;
  Parcels?: unknown[] | null;
  [key: string]: unknown;
};

export type YunExpressPrintLabelResponse = {
  Code?: string;
  Message?: string;
  Item?: YunExpressPrintLabelItem[] | null;
};

export type YunExpressPrintLabelItem = {
  Url?: string | null;
  LabelType?: string | null;
  OrderInfos?: YunExpressPrintLabelOrderInfo[] | null;
  [key: string]: unknown;
};

export type YunExpressPrintLabelOrderInfo = {
  CustomerOrderNumber?: string | null;
  Error?: string | null;
  Code?: string | number | null;
  [key: string]: unknown;
};

export type YunExpressTrackingNumberItem = {
  CustomerOrderNumber?: string | null;
  WayBillNumber?: string | null;
  TrackingNumber?: string | null;
  ChildTrackings?: unknown[];
  Remark?: string | null;
  Status?: number | string | null;
};

export type YunExpressTrackInfoResponse = {
  Code?: string;
  Message?: string;
  Item?: YunExpressTrackInfoItem | null;
};

export type YunExpressTrackInfoItem = {
  CountryCode?: string | null;
  WayBillNumber?: string | null;
  TrackingNumber?: string | null;
  CarrierName?: string | null;
  ProviderName?: string | null;
  ProviderTelephone?: string | null;
  ProviderSite?: string | null;
  PackageState?: number | string | null;
  TrackingStatus?: number | string | null;
  OrderTrackingDetails?: YunExpressTrackInfoEvent[] | null;
};

export type YunExpressTrackInfoEvent = {
  TrackingStatus?: number | string | null;
  ProcessContent?: string | null;
  ProcessDate?: string | null;
  ProcessTimezone?: string | null;
  ProcessLocation?: string | null;
  ProcessCountry?: string | null;
  ProcessProvince?: string | null;
  ProcessCity?: string | null;
  TrackNodeCode?: string | null;
  TrackCodeDescription?: string | null;
  AbnormalReasons?: unknown[] | null;
};

export type YunExpressGetCarrierResponse = {
  Code?: string;
  Message?: string;
  Item?: YunExpressCarrierItem[] | null;
};

export type YunExpressShippingFeeDetailResponse = {
  Code?: string;
  Message?: string;
  Item?: YunExpressShippingFeeDetailItem | null;
};

export type YunExpressShippingFeeDetailItem = {
  ShippingMethodName?: string | null;
  CountryCode?: string | null;
  CustomerOrderNumber?: string | null;
  WayBillNumber?: string | null;
  TrackingNumber?: string | null;
  GrossWeight?: string | number | null;
  ChargeWeight?: string | number | null;
  Freight?: string | number | null;
  FuelSurcharge?: string | number | null;
  RegistrationFee?: string | number | null;
  ProcessingFee?: string | number | null;
  OtherFee?: string | number | null;
  TotalFee?: string | number | null;
  OccurrenceTime?: string | null;
};

export type YunExpressDeleteOrderResponse = {
  Code?: string;
  Message?: string;
  Item?: {
    OrderNumber?: string | null;
    Status?: string | number | null;
    Type?: string | number | null;
    Remark?: string | null;
  } | null;
};

export type YunExpressCarrierItem = {
  OrderCode?: string | null;
  OrderCodeType?: string | null;
  CarrierCode?: string | null;
  CarrierCName?: string | null;
  CarrierEName?: string | null;
  CarrierPhone?: string | null;
  CarrierWebsite?: string | null;
};
