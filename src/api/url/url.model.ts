import { ObjectId } from "mongodb";
import type { SEOData } from "@/common/services/seo.service";

interface UrlType {
  _id?: ObjectId;
  owner_id: ObjectId | null;
  url: string;
  views: number;
  alias: string;
  password: string | null;
  is_active: boolean;
  qr_code: string;
  exp: Date | null;
  seo_data: SEOData;
  created_at?: Date;
  updated_at?: Date;
}
export class URL {
  _id?: ObjectId;
  owner_id: ObjectId | null;
  views: number;
  url: string;
  alias: string;
  password: string | null;
  is_active: boolean;
  qr_code: string;
  exp: Date | null;
  created_at: Date;
  updated_at: Date;
  seo_data: SEOData;
  constructor({
    _id,
    owner_id,
    url,
    views,
    alias,
    password,
    is_active,
    exp,
    qr_code,
    seo_data,
    created_at,
    updated_at,
  }: UrlType) {
    const date = new Date();
    this.seo_data = seo_data;
    this._id = new ObjectId(_id);
    this.owner_id = owner_id ? new ObjectId(owner_id) : null;
    this.url = url;
    this.views = views;
    this.alias = alias;
    this.password = password;
    this.is_active = is_active;
    this.qr_code = qr_code;
    this.created_at = created_at ? new Date(created_at) : date;
    this.updated_at = updated_at ? new Date(updated_at) : date;
    this.exp = exp;
  }
}
export interface CreateShortUrlRequest {
  url: string;
  alias: string;
  password?: string;
}
export interface DeleteURLsRequest {
  ids: string[];
}
export interface DeleteQrHistoryRequest extends DeleteURLsRequest {}
export interface GetURLPasswordRequest {
  alias: string;
  password: string;
}
export interface UpdateUrlRequest extends Partial<CreateShortUrlRequest> {
  is_active?: boolean;
}
export interface URLMini {
  _id: string;
  is_active: boolean;
}

interface QRScanHistoryType {
  _id?: ObjectId;
  owner_id: ObjectId;
  decoded: string | null;
  created_at?: Date;
}

export class QRScanHistory {
  _id?: ObjectId;
  owner_id: ObjectId;
  decoded: string | null;
  created_at: Date;
  constructor({ _id, owner_id, decoded, created_at }: QRScanHistoryType) {
    const date = new Date();
    this._id = _id ? _id : new ObjectId(_id);
    this.owner_id = owner_id ? owner_id : new ObjectId(owner_id);
    this.decoded = decoded;
    this.created_at = created_at ? new Date(created_at) : date;
  }
}
