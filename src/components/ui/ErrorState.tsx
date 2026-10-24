import { AlertCircle } from "lucide-react";

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      className="grid min-h-48 place-items-center rounded-lg border border-rose-200 bg-rose-50/50 px-6 py-8 text-center"
      role="alert"
    >
      <div className="mx-auto grid max-w-sm justify-items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white border border-rose-200 text-rose-600 shadow-sm">
          <AlertCircle className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-sm font-medium text-rose-800">{message}</p>
        {retry ? (
          <button
            className="h-8 rounded-md border border-rose-200 bg-white px-3.5 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-50"
            onClick={retry}
            type="button"
          >
            Thử lại
          </button>
        ) : null}
      </div>
    </div>
  );
}
