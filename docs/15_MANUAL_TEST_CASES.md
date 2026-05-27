# Fulfillment Platform v2 - Manual Test Cases

Tai lieu nay dung de test thu cong day du Fulfillment Platform v2 tren moi truong local/test duoc phe duyet.

Khong dung tai lieu nay de test production neu chua co release approval rieng. Khong in, chup man hinh, copy hoac ghi lai secrets, cookies, session tokens, password, password hash, API key plaintext, carrier credentials, DB URL day du, raw payload, raw response, encrypted payload hoac Authorization header.

## 1. Dieu kien truoc khi test

- [ ] `APP_ENV` la `local` hoac `test`.
- [ ] `DATABASE_URL` tro toi DB local/test duoc phe duyet.
- [ ] Khong ket noi production DB.
- [ ] Da chay seed local/test neu can tai khoan seed.
- [ ] `DEV_ADMIN_PASSWORD` va `DEV_TEST_PASSWORD` co trong `.env`, khong ghi gia tri vao report.
- [ ] Dev server chay duoc bang `npm run dev`.
- [ ] Browser test neu chay thi dung port rieng, vi du `PLATFORM_TEST_PORT=3016 npm run test:platform`.

Tai khoan seed thuong dung:

| Tai khoan | Vai tro ky vong | Ghi chu |
| --- | --- | --- |
| `admin@example.com` | Tenant `OWNER` va `PLATFORM_ADMIN` | Dung de test full platform admin. |
| `tenant-admin@example.com` | Tenant `ADMIN` | Khong co platform access. |
| `operator@example.com` | Tenant `OPERATOR` | Test shipment operations va platform denial. |
| `viewer@example.com` | Tenant `VIEWER` | Test read-only UI. |

Mat khau lay tu environment variables, khong ghi vao tai lieu ket qua.

## 2. Smoke test bat buoc

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| SMK-001 | App boot | Mo `/login` | Trang login render, khong loi 500 | [ ] |
| SMK-002 | Build local | Chay `npm run build` | Build pass, chi chap nhan warning da biet neu co | [ ] |
| SMK-003 | Typecheck | Chay `npm run typecheck` | Pass | [ ] |
| SMK-004 | Lint | Chay `npm run lint` | Pass; neu con warning cu `Topbar.tsx` thi ghi lai | [ ] |
| SMK-005 | Health API | Goi `GET /api/health` | `200`, response success | [ ] |

## 3. Auth va session

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| AUTH-001 | Login thanh cong | Login bang `admin@example.com` | Redirect vao `/orders` hoac dashboard protected | [ ] |
| AUTH-002 | Login sai mat khau | Nhap email dung, password sai | Hien generic error, khong leak chi tiet | [ ] |
| AUTH-003 | Login email invalid | Nhap email sai format | UI/API bao loi validation an toan | [ ] |
| AUTH-004 | Disable double submit | Bam submit nhieu lan khi login | Button disabled/loading, khong spam request bat thuong | [ ] |
| AUTH-005 | Me API | Sau login goi `GET /api/auth/me` | Tra safe user va tenant memberships, khong co hash/token | [ ] |
| AUTH-006 | Logout | Bam logout | `POST /api/auth/logout`, redirect `/login` | [ ] |
| AUTH-007 | Protected route unauth | Clear cookie, mo `/orders` | Redirect `/login` hoac safe protected behavior | [ ] |
| AUTH-008 | Session expired message | Mo `/login?reason=session_expired` | Hien message session expired an toan | [ ] |
| AUTH-009 | Browser storage | Kiem tra localStorage/sessionStorage | Khong co password, session token, API key plaintext | [ ] |

## 4. Dashboard shell va navigation

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| NAV-001 | Sidebar/header persistent | Login, click Orders/Shipments/Settings | Sidebar/header khong full reload; main content doi | [ ] |
| NAV-002 | Active nav | Chuyen tung route | Nav active dung route | [ ] |
| NAV-003 | Tenant badge | Login tenant user | Hien tenant name/slug dung, khong cho nhap tenantId tuy y | [ ] |
| NAV-004 | Role badge | Login tung role | Badge role dung: OWNER/ADMIN/OPERATOR/VIEWER | [ ] |
| NAV-005 | Tablet layout | Resize width khoang 768px | Sidebar/table/drawer khong vo layout nghiem trong | [ ] |
| NAV-006 | Focus navigation | Dung Tab di qua nav/buttons | Focus ring ro, keyboard usable | [ ] |

## 5. Orders

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| ORD-001 | Orders list load | Mo `/orders` | Goi `GET /api/orders`, hien table hoac empty state | [ ] |
| ORD-002 | Loading state | Reload cham/throttle network | Hien skeleton/loading | [ ] |
| ORD-003 | Empty state | Test tenant khong co orders | Message: orders se xuat hien khi nhan tu Portal | [ ] |
| ORD-004 | Error state | Gia lap API error | Hien generic error va retry | [ ] |
| ORD-005 | Pagination | Bam next/previous | Query params/page update dung, data reload | [ ] |
| ORD-006 | Search debounce | Nhap search lien tuc | Khong spam API qua muc, delay khoang 400ms | [ ] |
| ORD-007 | Status filter | Chon status | Reset page 1, data filter dung | [ ] |
| ORD-008 | Date range | Chon from/to | Query dung, ket qua theo ngay | [ ] |
| ORD-009 | Sorting | Sort receivedAt/status | Chi sort trang hien tai neu client-side; khong loi | [ ] |
| ORD-010 | Expand default | Vao `/orders` | Tat ca rows expanded san | [ ] |
| ORD-011 | Toggle arrow | Click mui ten mot row | Chi row do collapse/expand | [ ] |
| ORD-012 | Row click no toggle | Click vung row khac arrow/order id | Khong dong/mo expand | [ ] |
| ORD-013 | Expand all | Bam `Mo tat ca` | Tat ca rows expanded | [ ] |
| ORD-014 | Collapse all | Bam `Dong tat ca` | Tat ca rows collapsed | [ ] |
| ORD-015 | Filter resets expanded | Doi filter/page | Rows moi default expanded | [ ] |
| ORD-016 | Lazy detail cache | Mo/collapse/mo lai row | Detail chi fetch lan dau moi orderId neu cache con | [ ] |
| ORD-017 | Order id copy | Click value cot order id/order number | Copy vao clipboard, co feedback | [ ] |
| ORD-018 | Expand panel sections | Xem expanded row | Co Order info, Recipient, Status history, Items, Shipments | [ ] |
| ORD-019 | No drawer render | Mo Orders | Khong render OrderDetailDrawer slide-in | [ ] |
| ORD-020 | No raw payload | Inspect UI/network response | UI khong render rawPayload/rawResponse/full raw JSON | [ ] |

## 6. Create draft shipment tu Orders

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| DRAFT-001 | OWNER/ADMIN/OPERATOR thay action | Login role co quyen, mo order expanded | Thay Create Draft/Add Shipment | [ ] |
| DRAFT-002 | VIEWER read-only | Login `viewer@example.com` | Khong thay Create Draft button | [ ] |
| DRAFT-003 | Open inline form | Bam Create Draft | Form chon items hien trong expand panel, khong modal/drawer | [ ] |
| DRAFT-004 | Quantity validation | Nhap qty 0, am, lon hon order qty | Submit bi chan hoac API tra safe error | [ ] |
| DRAFT-005 | Submit success | Chon item hop le, submit | Goi `POST /api/shipments`; toast `Draft shipment created.`; refresh shipments section | [ ] |
| DRAFT-006 | Submit fail | Gia lap/API fail | Toast error generic, UI khong crash | [ ] |
| DRAFT-007 | No carrier call | Tao draft shipment | Khong goi YunExpress/carrier execute/tracking | [ ] |

## 7. Shipments

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| SHP-001 | Shipments list load | Mo `/shipments` | Goi `GET /api/shipments`, hien table/empty | [ ] |
| SHP-002 | Filter status | Chon status | Reset page 1, query dung | [ ] |
| SHP-003 | Date range | Chon from/to | Query dung | [ ] |
| SHP-004 | Pagination | Next/previous | Page update dung | [ ] |
| SHP-005 | Tracking copy | Shipment co tracking | CopyButton copy tracking number | [ ] |
| SHP-006 | Row open detail | Click shipment row | Mo ShipmentDetailPanel | [ ] |
| SHP-007 | Detail load | Panel mo | Goi `GET /api/shipments/:id`, hien items/timeline | [ ] |
| SHP-008 | Detail error retry | Gia lap API detail error | Hien ErrorState va retry | [ ] |
| SHP-009 | Drawer responsive | Resize nho hon md | Panel full width, close usable | [ ] |
| SHP-010 | No raw carrier data | Inspect panel | Khong hien rawResponse/rawPayload/credentials/Authorization | [ ] |

## 8. Shipment preflight va execute

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| EXEC-001 | Preflight manual only | Mo shipment detail | Khong auto-call `/preflight` truoc khi bam | [ ] |
| EXEC-002 | Run preflight | Bam Run Preflight | Goi `GET /api/shipments/:id/preflight`, hien checklist | [ ] |
| EXEC-003 | Preflight safety | Xem mapping preview | Khong hien customerNo/apiSecret/Authorization/encryptedPayload/rawResponse | [ ] |
| EXEC-004 | Live disabled | Preflight `liveEnabled=false` | Hien warning sandbox/live disabled, execute disabled | [ ] |
| EXEC-005 | Live enabled warning | Preflight `liveEnabled=true`, status DRAFT/FAILED_CREATE | Hien warning live mode active, button enable | [ ] |
| EXEC-006 | Hidden execute by status | Shipment status khac DRAFT/FAILED_CREATE | Execute button an | [ ] |
| EXEC-007 | Live confirmation locked | Mo modal execute | Confirm disabled den khi checkbox + exact text | [ ] |
| EXEC-008 | Exact typed text | Nhap sai case/spaces | Confirm van disabled | [ ] |
| EXEC-009 | Execute double submit | Click confirm | Button disable ngay, khong double submit | [ ] |
| EXEC-010 | Execute success | Execute bang moi truong duoc phe duyet | Toast success, close modal, refresh detail | [ ] |
| EXEC-011 | Execute fail | Gia lap/API fail | Error trong modal, cancel enabled, confirm khong re-enable | [ ] |
| EXEC-012 | No auto retry | Execute fail | Khong auto retry | [ ] |
| EXEC-013 | No automatic execute | Mo panel/reload page | Khong goi `/execute` neu khong click confirm | [ ] |

Ghi chu: khong test live/sandbox YunExpress execute neu chua co phe duyet thu cong rieng.

## 9. Tracking sync

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| TRK-001 | Manual only | Mo shipment detail | Khong auto-call `/tracking`, khong polling | [ ] |
| TRK-002 | Disabled missing key | Shipment thieu lookup key/carrier | Sync disabled voi message an toan | [ ] |
| TRK-003 | Role gating VIEWER | Login VIEWER | Sync read-only/disabled | [ ] |
| TRK-004 | Sync click | Login OWNER/ADMIN/OPERATOR, bam Sync | Goi `POST /api/shipments/:id/tracking` mot lan | [ ] |
| TRK-005 | Pending double submit | Bam sync lien tuc | Button disabled khi pending | [ ] |
| TRK-006 | Sync success | API success | Toast `Tracking synced.`, TrackingResultPanel update, detail refresh | [ ] |
| TRK-007 | Sync fail | API fail | Toast generic error, khong crash | [ ] |
| TRK-008 | No raw response | Xem result panel/audit | Khong hien raw carrier response/payload/credentials | [ ] |

## 10. Settings - Tenant profile

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| SET-TEN-001 | Open settings | Mo `/settings` | Default tab Tenant Profile | [ ] |
| SET-TEN-002 | Tenant display | Xem Tenant Profile | Name, slug, role, status dung | [ ] |
| SET-TEN-003 | Read-only | Thu tim edit form | Khong co edit tenant profile trong tenant settings | [ ] |
| SET-TEN-004 | Tab URL | Chuyen tab | URL `?tab=...` update/deep-link duoc | [ ] |

## 11. Settings - API Keys

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| APIKEY-001 | List API keys | Mo tab API Keys | Goi `GET /api/tenants/current/api-keys` | [ ] |
| APIKEY-002 | Role visibility | Login OPERATOR/VIEWER | Khong thay Create/Revoke controls | [ ] |
| APIKEY-003 | Create validation name | Submit name rong/qua dai | Inline error | [ ] |
| APIKEY-004 | Create validation scopes | Khong chon scopes | Inline error | [ ] |
| APIKEY-005 | Create validation expiry | Expiry qua khu | Inline error | [ ] |
| APIKEY-006 | Create success | Tao key hop le | Toast `API key created.`, reveal modal mo | [ ] |
| APIKEY-007 | One-time reveal | Dong modal reveal | Plaintext key bien mat, khong xem lai duoc | [ ] |
| APIKEY-008 | Reveal no backdrop/Esc | Click backdrop/Esc | Modal khong dong | [ ] |
| APIKEY-009 | Copy plaintext | Bam copy trong reveal | Copy thanh cong, khong log key | [ ] |
| APIKEY-010 | Revoke confirmation | Bam Revoke | ConfirmationModal hien truoc DELETE | [ ] |
| APIKEY-011 | Revoke success | Confirm revoke | Toast `API key revoked.`, list refresh | [ ] |
| APIKEY-012 | Security inspect | Inspect UI/storage/log | Khong co keyHash/plaintext sau close/localStorage/sessionStorage | [ ] |

## 12. Settings - Members

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| MEM-001 | List members | Mo Members tab | Goi `GET /api/tenants/current/members`, hien safe fields | [ ] |
| MEM-002 | Empty state | Tenant khong co members ngoai user | Hien empty/readable state | [ ] |
| MEM-003 | Role visibility VIEWER | Login VIEWER | Khong thay Edit controls | [ ] |
| MEM-004 | Edit modal | Login OWNER/ADMIN, bam Edit | Modal hien role/status controls | [ ] |
| MEM-005 | Self disable guard | Edit chinh minh | Status toggle disabled hoac API safe error | [ ] |
| MEM-006 | Last owner guard | Thu demote/disable owner cuoi | UI/API chan voi safe conflict | [ ] |
| MEM-007 | Save success | Doi role/status hop le | Confirmation neu co, toast `Member updated.`, list refresh | [ ] |
| MEM-008 | Save fail | API fail | Toast generic/safe, khong crash | [ ] |
| MEM-009 | No sensitive fields | Inspect UI/response | Khong co passwordHash/tokenHash/session data | [ ] |

## 13. Settings - Carrier accounts

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| CAR-001 | List accounts | Mo Carrier Accounts tab | Goi `GET /api/tenants/current/carrier-accounts` | [ ] |
| CAR-002 | Credential status | Xem account cards | Sandbox/live/not configured badge dung | [ ] |
| CAR-003 | Role visibility | OPERATOR/VIEWER | Khong thay manage credential controls | [ ] |
| CAR-004 | Open credential form | OWNER/ADMIN bam Manage Credential | Form autocomplete off, apiSecret password blank | [ ] |
| CAR-005 | Reopen secret blank | Dong/mo lai form | `apiSecret` luon trong | [ ] |
| CAR-006 | Show/hide secret | Bam show | Toggle type password/text | [ ] |
| CAR-007 | Live warning | Tick live mode | Hien warning live mode | [ ] |
| CAR-008 | Save success | Submit hop le | Toast `Credential saved.`, close modal, clear form | [ ] |
| CAR-009 | Save failure | API fail | Toast error, clear `apiSecret`, giu field khac neu safe | [ ] |
| CAR-010 | No carrier call | Save credential | Khong goi YunExpress, khong validate live carrier | [ ] |
| CAR-011 | Secret safety | Inspect UI/log/storage | Khong hien/lưu apiSecret/customer credential/encryptedPayload | [ ] |

## 14. Settings - Tenant audit logs

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| TAUD-001 | Role visibility | OWNER/ADMIN mo Settings | Thay tab Audit Logs | [ ] |
| TAUD-002 | Hidden for OPERATOR/VIEWER | Login OPERATOR/VIEWER | Khong thay tab Audit Logs | [ ] |
| TAUD-003 | Direct access denied | OPERATOR/VIEWER mo `?tab=audit-logs` | Redirect ve Tenant Profile hoac safe denial | [ ] |
| TAUD-004 | Filters | Chon action/actor/resource/date/search | Query/filter dung, reset page neu can | [ ] |
| TAUD-005 | Safe metadata | Expand metadata | Qua SafeMetadataViewer, key nhay cam redacted | [ ] |
| TAUD-006 | Empty/no results | Filter khong co data | Message: no audit logs for filters | [ ] |

## 15. Platform Admin - Authorization matrix

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| PAUTH-001 | Unauth API | Clear cookie, `GET /api/platform/tenants` | `401` | [ ] |
| PAUTH-002 | Unauth page | Clear cookie, mo `/platform/tenants` | Redirect `/login` | [ ] |
| PAUTH-003 | Platform admin access | Login `admin@example.com`, mo `/platform/tenants` | `200`, list render | [ ] |
| PAUTH-004 | Tenant admin denied | Login `tenant-admin@example.com`, mo platform API/page | API `403`, UI safe `404`/denial, khong 500 | [ ] |
| PAUTH-005 | Operator denied | Login `operator@example.com`, mo platform API/page | API `403`, UI safe `404`/denial | [ ] |
| PAUTH-006 | Viewer denied | Login `viewer@example.com`, mo platform API/page | API `403`, UI safe `404`/denial | [ ] |
| PAUTH-007 | Platform support read-only | Login support test user | GET pages/API allowed; mutation controls hidden | [ ] |
| PAUTH-008 | Support mutation denied | Support POST/PATCH platform API | `403`, no state change | [ ] |

## 16. Platform Admin - Tenants list va create tenant

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| PTEN-001 | Tenants list | Admin mo `/platform/tenants` | List/search/pagination render | [ ] |
| PTEN-002 | Search tenant | Nhap search | Ket qua filter dung | [ ] |
| PTEN-003 | Create form validation name | Name rong/qua dai | Inline error, focus first invalid | [ ] |
| PTEN-004 | Create form validation slug | Slug co uppercase/space/symbol | Inline error, helper/preview ro | [ ] |
| PTEN-005 | Required type/status | Bo trong type/status | Inline error | [ ] |
| PTEN-006 | Owner email invalid | Nhap email sai | Inline error | [ ] |
| PTEN-007 | New owner no password | Email moi, password rong | Safe validation/password required | [ ] |
| PTEN-008 | Password policy | Password ngan hon policy | Safe validation | [ ] |
| PTEN-009 | Existing owner attach | Email user da ton tai, password rong | Tenant tao, user duoc attach OWNER neu API support | [ ] |
| PTEN-010 | Duplicate slug | Tao slug da ton tai | Safe `409 CONFLICT`, khong 500 | [ ] |
| PTEN-011 | Create success | Tao temp tenant hop le | Toast success, list refresh, navigate detail | [ ] |
| PTEN-012 | Double submit guard | Double click Create | Chi tao mot tenant | [ ] |
| PTEN-013 | Password cleanup | Success/fail create | Password field cleared, khong luu storage/log | [ ] |

## 17. Platform Admin - Tenant detail

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| PDET-001 | Detail load | Admin mo `/platform/tenants/:tenantId` | Summary render: name, slug, type, status, counts, timestamps | [ ] |
| PDET-002 | Skeleton/error | Gia lap load cham/fail | Skeleton/error retry an toan | [ ] |
| PDET-003 | Support read-only note | Support mo detail | Hien read-only note, khong mutation controls | [ ] |
| PDET-004 | Edit validation | Admin edit name/type/status invalid | Inline error, focus invalid | [ ] |
| PDET-005 | Disable tenant confirmation | Doi status DISABLED | Co confirmation truoc save | [ ] |
| PDET-006 | Save tenant success | Doi field hop le | Toast success, detail refresh, audit log tao | [ ] |
| PDET-007 | Save tenant fail | API fail | Safe error, khong raw internals | [ ] |
| PDET-008 | Members list | Xem members section | Email/name/role/status/timestamps render safe | [ ] |
| PDET-009 | Add member validation | Email/password/role/status invalid | Inline error, password policy | [ ] |
| PDET-010 | Add member success | Add temp member | Toast success, list refresh, audit log tao | [ ] |
| PDET-011 | Add duplicate member | Add existing membership | Safe `409 CONFLICT` | [ ] |
| PDET-012 | Update member confirmation | Doi role/status | Confirmation truoc save | [ ] |
| PDET-013 | Update member success | Save role/status hop le | Toast success, audit log tao | [ ] |
| PDET-014 | Password cleanup | Add member success/fail | Password field cleared | [ ] |

## 18. Platform Admin - Audit logs

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| PAUD-001 | Audit logs page | Admin mo `/platform/audit-logs` | Page render list/empty state | [ ] |
| PAUD-002 | Support access | Support mo `/platform/audit-logs` | Read-only page render | [ ] |
| PAUD-003 | Tenant role denied | Operator/viewer mo page | Safe denial, khong 500 | [ ] |
| PAUD-004 | Preset All | Chon All | Goi list all, pagination dung | [ ] |
| PAUD-005 | Preset Mutations | Chon Mutations | Dung backend `actions=...`, hien mutation events | [ ] |
| PAUD-006 | Preset Denied Access | Chon Denied Access | Dung backend `actions=...`, hien denied events | [ ] |
| PAUD-007 | Exact action | Chon `PLATFORM_TENANT_CREATED` | Dung `action=...`, chi action do | [ ] |
| PAUD-008 | Multi-action API invalid | Goi `actions=VALID,INVALID` | `400 VALIDATION_ERROR` an toan | [ ] |
| PAUD-009 | Actor type filter | Chon USER/API_KEY/SYSTEM | Filter dung | [ ] |
| PAUD-010 | Resource type filter | Nhap Tenant/PlatformAccess | Filter dung | [ ] |
| PAUD-011 | Tenant ID filter | Nhap tenant id | Filter dung | [ ] |
| PAUD-012 | Date range | Chon from/to | `to` include full selected day | [ ] |
| PAUD-013 | URL deep-link | Copy URL co filters, mo tab moi | Filters duoc restore | [ ] |
| PAUD-014 | Clear filters | Bam Clear filters | URL ve `/platform/audit-logs`, controls reset | [ ] |
| PAUD-015 | Metadata safety | Expand metadata | No raw JSON; long strings truncated; sensitive keys redacted | [ ] |
| PAUD-016 | Denied highlight | Xem denied events | Co visual highlight/pill ro rang | [ ] |

## 19. Platform audit telemetry

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| TEL-001 | Non-platform API denied | Operator `GET /api/platform/tenants` | `403`, ghi mot `PLATFORM_ACCESS_DENIED` | [ ] |
| TEL-002 | Support mutation denied | Support POST/PATCH platform mutation | `403`, ghi mot `PLATFORM_MUTATION_DENIED` | [ ] |
| TEL-003 | Unauth skipped | Unauth platform API | `401`, khong audit denied telemetry | [ ] |
| TEL-004 | Support read skipped | Support GET platform read | `200`, khong ghi denied telemetry | [ ] |
| TEL-005 | Admin read skipped | Admin GET platform read | `200`, khong ghi denied telemetry | [ ] |
| TEL-006 | Metadata safe | Xem telemetry metadata | Chi co routeGroup/method/reasonCode/actorPlatformRole/result | [ ] |
| TEL-007 | No duplicate | Goi mot denied helper path mot lan | Khong tao duplicate rows cho cung request | [ ] |

## 20. Portal receive va tenant API key

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| PORTAL-001 | Missing API key | POST `/api/portal/orders` khong key | `401` generic | [ ] |
| PORTAL-002 | Invalid API key | POST voi key sai | `401`, khong lo key ton tai hay khong | [ ] |
| PORTAL-003 | Scope missing | Key khong co `orders:write` | `403`/safe denial | [ ] |
| PORTAL-004 | Valid order receive | POST payload hop le voi key approved | Tao order tenant-scoped, audit safe | [ ] |
| PORTAL-005 | Tenant override ignored | Body co tenantId khac | Server dung tenant tu API key, khong tin body | [ ] |
| PORTAL-006 | Duplicate external order | Gui duplicate neu policy co | Tra conflict/idempotent theo contract hien tai | [ ] |
| PORTAL-007 | Raw payload safety | Xem dashboard/API list/detail | Khong render raw payload mac dinh | [ ] |

## 21. RBAC tenant dashboard

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| RBAC-001 | OWNER | Login owner | Thay settings/API key/member/carrier actions | [ ] |
| RBAC-002 | ADMIN | Login tenant admin | Thay tenant admin actions theo policy | [ ] |
| RBAC-003 | OPERATOR | Login operator | Co order/shipment ops, khong manage API keys/members/carriers | [ ] |
| RBAC-004 | VIEWER | Login viewer | Read-only, khong thay mutation actions | [ ] |
| RBAC-005 | Server source of truth | Goi API mutation bang role thieu quyen | API tra `403`, ke ca UI an button | [ ] |
| RBAC-006 | Tenant scope | Dung id resource tenant khac neu co | Tra `404`/`403` safe, khong leak data | [ ] |

## 22. Security va data leakage

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| SEC-001 | No password/hash | Inspect UI/API common flows | Khong co passwordHash/tokenHash/keyHash | [ ] |
| SEC-002 | No session token | Inspect response body/storage | Raw session token khong xuat hien | [ ] |
| SEC-003 | No API key plaintext after close | Tao API key, close reveal | Khong con plaintext trong UI/storage | [ ] |
| SEC-004 | No carrier secrets | Settings/shipments/preflight | Khong hien customerNo/apiSecret/Authorization/encryptedPayload | [ ] |
| SEC-005 | No raw carrier response | Execute/tracking result/audit | Khong hien rawResponse/rawPayload | [ ] |
| SEC-006 | Same-origin mutation | Goi mutation voi Origin/Referer khong hop le | Bi chan theo policy | [ ] |
| SEC-007 | Rate limit login | Thu login sai lap lai co kiem soat | `429` safe neu cham nguong | [ ] |
| SEC-008 | Error messages | Lam API fail | Message generic, khong stack trace/server internals | [ ] |
| SEC-009 | Clipboard safety | Copy order/tracking/API key reveal | Chi copy field duoc phep, khong copy encrypted/master key | [ ] |
| SEC-010 | Browser console | Chay core flows | Khong co console log secrets/credential payloads | [ ] |

## 23. UI/UX polish va accessibility

| ID | Test case | Buoc test | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| UX-001 | Loading states | Slow network cac page chinh | Skeleton/loading phu hop layout | [ ] |
| UX-002 | Empty states | Data empty cac section | Message dung context | [ ] |
| UX-003 | Error retry | Gia lap GET fail | ErrorState co Retry | [ ] |
| UX-004 | Toast mutations | Tao draft, execute, sync, create/revoke key, member, credential | Success/error toast dung message, duration hop ly | [ ] |
| UX-005 | Confirmation modal focus | Mo destructive modal | Cancel autoFocus, Enter khong accidentally confirm | [ ] |
| UX-006 | Pending modal | Confirm mutation pending | Cancel/Confirm disabled, spinner | [ ] |
| UX-007 | Keyboard table rows | Dung Tab/Enter/Space voi rows co role button | Hoat dong dung, khong trap focus sai | [ ] |
| UX-008 | Icon buttons aria | Copy/close/revoke icon-only | Co aria-label | [ ] |
| UX-009 | Modal focus trap | Mo modal/reveal | Focus trap dung, close dung policy | [ ] |
| UX-010 | Not found page | Mo route khong ton tai | 404 page dep, link dashboard | [ ] |
| UX-011 | Error boundary | Throw route error trong dev/test neu co | Error page render, refresh/dashboard actions | [ ] |
| UX-012 | Tablet breakpoint | Test 768px | Tables hide columns dung, tabs scroll ngang, drawer full width | [ ] |
| UX-013 | Bright theme | Kiem tra key screens | Nen page/surface, indigo accent, cards/tables/badges dung theme | [ ] |

## 24. Automated regression commands

Chay tren local/test DB duoc phe duyet. Khong chay tren production.

| ID | Command | Ket qua mong doi | Status |
| --- | --- | --- | --- |
| AUTO-001 | `npm run typecheck` | Pass | [ ] |
| AUTO-002 | `npm run lint` | Pass; ghi lai warning da biet neu co | [ ] |
| AUTO-003 | `npm run build` | Pass | [ ] |
| AUTO-004 | `npm run prisma:validate` | Pass | [ ] |
| AUTO-005 | `npm run prisma:generate` | Pass | [ ] |
| AUTO-006 | `PLATFORM_TEST_PORT=3016 npm run test:platform` | Pass, khong in secrets, cleanup 0 remaining | [ ] |

## 25. Manual carrier/live operation gate

Khong thuc hien cac test nay neu chua co approval rieng cho carrier/live/sandbox.

| ID | Test case | Dieu kien | Ket qua mong doi | Status |
| --- | --- | --- | --- | --- |
| LIVE-001 | YunExpress live execute | Chi khi user phe duyet live/sandbox manual | Execute chi sau LiveActionConfirmation, no double submit | [ ] |
| LIVE-002 | Live result review | Sau execute manual | Record safe status/tracking/label, khong raw response | [ ] |
| LIVE-003 | Tracking live review | Chi khi user trigger manual | Sync tracking khong auto, khong poll, no raw response | [ ] |

## 26. Test report template

Dung mau nay khi ket thuc test:

```text
Ngay test:
Moi truong:
Tester:
Commit/branch:

Tong ket:
- Passed:
- Failed:
- Blocked:
- Not run:

Loi nghiem trong:
1.
2.

Security confirmation:
- Khong dung production DB:
- Khong goi external/YunExpress/carrier APIs neu chua approve:
- Khong tao shipment live/sandbox neu chua approve:
- Khong in/lưu secrets:

Cleanup:
- Temp tenants:
- Temp users:
- Temp audit logs:
- Temp shipments:

Ghi chu:
```

