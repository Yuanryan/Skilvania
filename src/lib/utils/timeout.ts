// 超時工具函數 - 用於防止 API 請求卡住

/**
 * 為 Promise 添加超時機制
 * @param promise 要執行的 Promise
 * @param timeoutMs 超時時間（毫秒），預設 5 秒
 * @param errorMessage 超時時的錯誤訊息
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * 檢查錯誤是否為超時錯誤
 */
export function isTimeoutError(error: any): boolean {
  return error?.message?.includes('timed out') || 
         error?.message?.includes('timeout') ||
         error?.code === 'ETIMEDOUT';
}

/**
 * 檢查錯誤是否為網路連接錯誤
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  return (
    isTimeoutError(error) ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('fetch failed') ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ETIMEDOUT'
  );
}

