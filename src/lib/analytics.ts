/**
 * Google Analytics tracking utility
 */

declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
  }
}

/**
 * Track position calculation event
 */
export const trackPositionCalculated = (
  symbol: string,
  direction: 'long' | 'short',
  leverage: number,
  positionSize: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'position_calculated', {
      event_category: 'trading',
      event_label: `${symbol}_${direction}`,
      leverage: leverage,
      position_size: positionSize,
    });
  }
};

/**
 * Track position adjustment event
 */
export const trackPositionAdjusted = (
  adjustmentType: 'add' | 'subtract',
  symbol: string,
  adjustmentSize: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'position_adjusted', {
      event_category: 'trading',
      event_label: symbol,
      adjustment_type: adjustmentType,
      adjustment_size: adjustmentSize,
    });
  }
};

/**
 * Track API error
 */
export const trackApiError = (errorMessage: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'exception', {
      description: `API Error: ${errorMessage}`,
      fatal: false,
    });
  }
};

/**
 * Track page view
 */
export const trackPageView = (pagePath: string, pageTitle: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};
