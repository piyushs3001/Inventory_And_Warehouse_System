"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

import { cn } from "../../utils"

const Combobox = ComboboxPrimitive.Root

function ComboboxValue(props: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value {...props} />
}

function ComboboxTrigger({
  className,
  size = "default",
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-3 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow,border-color] outline-none select-none hover:border-border-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-9 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=combobox-trigger-value]:line-clamp-1 *:data-[slot=combobox-trigger-value]:flex *:data-[slot=combobox-trigger-value]:items-center *:data-[slot=combobox-trigger-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-popover px-2.5 py-2">
      <SearchIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "flex h-6 w-full bg-transparent text-sm text-popover-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function ComboboxContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative isolate z-50 flex max-h-(--available-height) w-(--anchor-width) min-w-48 origin-(--transform-origin) flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("scroll-py-1 overflow-y-auto overflow-x-hidden p-1", className)}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "px-3 py-6 text-center text-sm text-muted-foreground empty:m-0 empty:p-0",
        className
      )}
      {...props}
    />
  )
}

export type ComboboxOption = {
  value: string
  label: React.ReactNode
  /** Muted helper line rendered under the label. */
  description?: React.ReactNode
  /** Extra text matched against the search query (alongside the label). */
  keywords?: string
  disabled?: boolean
}

/** Flatten a node's text content so it can be matched against the query. */
function nodeToText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join(" ")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeToText(node.props.children)
  }
  return ""
}

/**
 * One-shot searchable dropdown — mirrors `SimpleSelect` but with a typeahead
 * search input at the top of the popover. Pass `value` + `onValueChange` +
 * `options`; renders a Select-styled trigger, a filtered scrollable list with
 * checkmarks, optional muted description lines, and a "No results" empty state.
 * Full-width by default; filtering is client-side over label text + `keywords`.
 */
function SimpleCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results",
  className,
  size = "default",
  disabled,
  id,
  name,
  "aria-label": ariaLabel,
}: {
  value?: string
  onValueChange?: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  size?: "sm" | "default"
  disabled?: boolean
  id?: string
  name?: string
  "aria-label"?: string
}) {
  // Precompute the lowercased haystack (label text + keywords) per option.
  const haystacks = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const o of options) {
      map.set(
        o.value,
        `${nodeToText(o.label)} ${o.keywords ?? ""}`.toLowerCase()
      )
    }
    return map
  }, [options])

  const selected = options.find((o) => o.value === value) ?? null

  return (
    <Combobox<ComboboxOption>
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange?.(next?.value ?? "")}
      itemToStringLabel={(item) => nodeToText(item.label)}
      itemToStringValue={(item) => item.value}
      isItemEqualToValue={(a, b) => a.value === b.value}
      filter={(item, query) => {
        if (query.length === 0) return true
        const hay = haystacks.get(item.value) ?? nodeToText(item.label).toLowerCase()
        return hay.includes(query.toLowerCase())
      }}
      disabled={disabled}
      name={name}
    >
      <ComboboxTrigger
        id={id}
        size={size}
        aria-label={ariaLabel}
        className={cn("w-full", className)}
      >
        <ComboboxValue>
          {(selectedItem: ComboboxOption | null) =>
            selectedItem ? (
              <span data-slot="combobox-trigger-value" className="line-clamp-1 flex flex-1 items-center gap-1.5 text-left">
                {selectedItem.label}
              </span>
            ) : (
              <span data-slot="combobox-trigger-value" className="flex flex-1 text-left text-muted-foreground">
                {placeholder}
              </span>
            )
          }
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder={searchPlaceholder} />
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: ComboboxOption) => (
            <ComboboxItem key={item.value} value={item} disabled={item.disabled}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{item.label}</span>
                {item.description != null && (
                  <span className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                )}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export {
  Combobox,
  SimpleCombobox,
  ComboboxValue,
  ComboboxTrigger,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
}
