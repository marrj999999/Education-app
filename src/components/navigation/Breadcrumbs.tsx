'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useNavigation, useNavigationOptional } from '@/lib/context/NavigationContext';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/lib/types/navigation';

// =============================================================================
// Types
// =============================================================================

interface BreadcrumbsProps {
  /** Maximum number of items to show before truncating */
  maxItems?: number;
  /** Additional CSS classes */
  className?: string;
  /** Static breadcrumbs (overrides context) */
  items?: BreadcrumbItemType[];
  /** Show home icon for first item */
  showHomeIcon?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function Breadcrumbs({
  maxItems = 4,
  className,
  items: staticItems,
  showHomeIcon = false,
}: BreadcrumbsProps) {
  // Try to get navigation context (may not be available)
  const navigation = useNavigationOptional();

  // Use static items if provided, otherwise use context
  const items = staticItems ?? navigation?.breadcrumbs ?? [];

  // Truncate items for mobile
  const displayItems = useMemo(() => {
    if (items.length <= maxItems) {
      return { items, truncated: false };
    }

    // Show first item, ellipsis, and last (maxItems - 2) items
    const first = items[0];
    const lastItems = items.slice(-(maxItems - 1));

    return {
      items: [first, ...lastItems],
      truncated: true,
      truncatedCount: items.length - maxItems,
    };
  }, [items, maxItems]);

  if (items.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={cn('py-2', className)}>
      <BreadcrumbList>
        {displayItems.items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === displayItems.items.length - 1;
          const showEllipsis = isFirst && displayItems.truncated;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {item.isCurrent || !item.href ? (
                  <BreadcrumbPage className="max-w-[150px] sm:max-w-[200px] truncate">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={item.href}
                      className="max-w-[100px] sm:max-w-[150px] truncate inline-block"
                    >
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>

              {/* Show ellipsis after first item if truncated */}
              {showEllipsis && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                </>
              )}

              {/* Separator (not after last item) */}
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// =============================================================================
// Static Breadcrumbs (for pages without NavigationProvider)
// =============================================================================

interface StaticBreadcrumbsProps {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}

export function StaticBreadcrumbs({ items, className }: StaticBreadcrumbsProps) {
  const breadcrumbItems: BreadcrumbItemType[] = items.map((item, index) => ({
    label: item.label,
    href: item.href,
    isCurrent: index === items.length - 1 && !item.href,
  }));

  return <Breadcrumbs items={breadcrumbItems} className={className} />;
}

export default Breadcrumbs;
