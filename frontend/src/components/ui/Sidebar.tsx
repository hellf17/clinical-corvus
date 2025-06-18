"use client";

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

interface SidebarContextProps {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (value: boolean | ((value: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: (value: boolean | ((value: boolean) => boolean)) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined
)

interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function SidebarProvider(
  {
    defaultOpen = true,
    open: openProp,
    onOpenChange,
    children,
    className,
    ...props
  }: SidebarProviderProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  console.log('[SidebarProvider] Rendering SidebarProvider');
  const [isMobile, setIsMobile] = React.useState(false)
  const [_open, _setOpen] = React.useState(defaultOpen)
  const [openMobile, setOpenMobile] = React.useState(false)

  // Handle controlled state.
  const open = openProp !== undefined ? openProp : _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (onOpenChange) {
        onOpenChange(openState)
      } else {
        _setOpen(openState)
      }

      // This sets the cookie to keep the sidebar state.
      // if (typeof document !== 'undefined') {
      //   document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      // }
    },
    [onOpenChange, open]
  )

  // Toggle sidebar.
  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value)
    } else {
      setOpen((value) => !value)
    }
  }, [setOpen, isMobile])

  // Handle mobile sidebar state.
  // React.useEffect(() => {
  //   // Guard added to ensure window exists
  //   if (typeof window !== 'undefined') {
  //     const handleResize = () => {
  //       setIsMobile(window.innerWidth < 1024)

  //       if (window.innerWidth >= 1024) {
  //         setOpenMobile(false)
  //       }
  //     }

  //     handleResize() // Call initially only on client

  //     window.addEventListener("resize", handleResize)
  //     return () => window.removeEventListener("resize", handleResize)
  //   }
  // }, [])

  // Handle keyboard shortcut.
  // React.useEffect(() => {
  //   // Guard added to ensure document exists
  //   if (typeof document !== 'undefined') {
  //     const handleKeyDown = (event: KeyboardEvent) => {
  //       if (
  //         event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
  //         (event.metaKey || event.ctrlKey)
  //       ) {
  //         event.preventDefault()
  //         toggleSidebar()
  //       }
  //     }

  //     document.addEventListener("keydown", handleKeyDown)
  //     return () => document.removeEventListener("keydown", handleKeyDown)
  //   }
  // }, [toggleSidebar])

  const contextValue = React.useMemo(() => {
    return {
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    } as SidebarContextProps
  }, [open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar])

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        ref={ref}
        data-open={open ? "true" : "false"}
        data-collapsible={open ? "expanded" : "collapsed"}
        className={cn(
          "group/sidebar-wrapper flex min-h-screen w-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

const ForwardedSidebarProvider = React.forwardRef(SidebarProvider)

function useSidebar() {
  const context = React.useContext(SidebarContext)

  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsible?: "offcanvas" | "icon" | "none"
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      collapsible = "icon",
      variant = "sidebar",
      side = "left",
      className,
      ...props
    },
    ref
  ) => {
    const { state, open, openMobile, setOpenMobile } =
      useSidebar()

    const isExpanded = state === "expanded"

    const width = open ? "var(--sidebar-width)" : "3.5rem"
    const mobileWidth = openMobile ? "var(--sidebar-width-mobile)" : "0px"

    const dataAttrs = {
      "data-state": state,
      "data-open": open ? "true" : "false",
      "data-variant": variant,
      "data-side": side,
      "data-collapsible": collapsible,
    }

    return (
      <>
        {/* Mobile offcanvas */} {
          collapsible === "offcanvas" && (
            <div
              data-state={openMobile ? "open" : "closed"}
              onClick={() => setOpenMobile(false)}
              className={cn(
                "fixed inset-0 z-40 bg-black/80 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 lg:hidden",
                !openMobile && "hidden"
              )}
            />
          )
        }

        <aside
          ref={ref}
          {...dataAttrs}
          {...props}
          className={cn(
            "group/sidebar z-50 flex shrink-0 flex-col transition-[width] duration-300 ease-in-out",
            "max-lg:absolute max-lg:h-full max-lg:shadow-lg max-lg:transition-[transform] max-lg:duration-300 max-lg:ease-in-out",
            collapsible === "none" && "max-lg:hidden",
            collapsible === "offcanvas" &&
            "max-lg:data-[state=collapsed]:-translate-x-full",
            collapsible === "icon" && "max-lg:hidden",
            variant === "floating" && "border-r-0 shadow-lg",
            variant === "inset" && "max-lg:border-r",
            className
          )}
          style={{
            backgroundColor: "var(--sidebar-background)",
            color: "var(--sidebar-foreground)",
            ["--sidebar-width"]: width,
            ["--sidebar-width-mobile"]: mobileWidth,
            width: "var(--sidebar-width)",
            transform:
              collapsible === "offcanvas" && !openMobile
                ? "translateX(-100%)"
                : undefined,
            ...props.style,
          } as React.CSSProperties}
        >
          {props.children}
        </aside>

        {/* Sidebar inset */} {
          variant === "inset" && (
            <div
              className={cn(
                "ml-[var(--sidebar-width)] transition-[margin-left] duration-300 ease-in-out",
                !open && "group-data-[collapsible=icon]/sidebar-wrapper:ml-14"
              )}
            />
          )
        }
      </>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarHeader =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div
        ref={ref}
        className={cn("flex h-14 shrink-0 items-center px-3", className)}
        {...props}
      />
    )
  )
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div
        ref={ref}
        className={cn("mt-auto flex shrink-0 items-center", className)}
        {...props}
      />
    )
  )
SidebarFooter.displayName = "SidebarFooter"

const SidebarContent =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div
        ref={ref}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden px-3 py-4",
          className
        )}
        {...props}
      />
    )
  )
SidebarContent.displayName = "SidebarContent"

const SidebarGroup =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={cn("flex flex-col gap-1", className)} {...props} />
    )
  )
SidebarGroup.displayName = "SidebarGroup"

interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const SidebarGroupLabel =
  React.forwardRef<HTMLButtonElement, SidebarGroupLabelProps>(
    ({ className, asChild, ...props }, ref) => {
      const { state } = useSidebar()
      const Comp = asChild ? Slot : "button"

      return (
        <Comp
          ref={ref}
          {...props}
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap px-3 text-base font-medium text-sidebar-foreground/60 transition-opacity duration-100 group-data-[state=collapsed]/sidebar:pointer-events-none group-data-[state=collapsed]/sidebar:opacity-0",
            !asChild &&
            "cursor-default select-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
      )
    }
  )
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction =
  React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ className, ...props }, ref) => {
      const { state } = useSidebar()

      return (
        <button
          ref={ref}
          className={cn(
            "absolute right-2 top-1.5 h-6 w-6 text-sidebar-foreground/60 transition-opacity group-hover/item:opacity-100 group-data-[state=collapsed]/sidebar:pointer-events-none group-data-[state=collapsed]/sidebar:opacity-0",
            className
          )}
          {...props}
        />
      )
    }
  )
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div
        ref={ref}
        className={cn("flex flex-col gap-1", className)}
        {...props}
      />
    )
  )
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn("flex flex-col gap-px", className)}
          {...props}
        />
      )
    }
  )
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn("group/item relative flex items-center", className)}
          {...props}
        />
      )
    }
  )
SidebarMenuItem.displayName = "SidebarMenuItem"

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
}

const SidebarMenuButton =
  React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
    ({ asChild, isActive, className, ...props }, ref) => {
      const Comp = asChild ? Slot : "button"
      const { state } = useSidebar()

      return (
        <Comp
          ref={ref}
          data-active={isActive ? "true" : undefined}
          className={cn(
            "peer/menu-button group/button flex h-9 w-full items-center gap-2 whitespace-nowrap rounded-md px-3 text-left text-xl font-medium text-sidebar-foreground/80 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring disabled:cursor-not-allowed disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground",
            className
          )}
          {...props}
        />
      )
    }
  )
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction =
  React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ className, ...props }, ref) => {
      const { state } = useSidebar()

      return (
        <button
          ref={ref}
          className={cn(
            "absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-sidebar-foreground/80 opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]/sidebar:pointer-events-none group-hover/item:opacity-100",
            className
          )}
          {...props}
        />
      )
    }
  )
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuSub =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            "ml-5 mt-1 flex flex-col gap-px border-l border-sidebar-border/40 pl-3",
            className
          )}
          {...props}
        />
      )
    }
  )
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div
          ref={ref}
          className={cn("group/subitem relative flex items-center", className)}
          {...props}
        />
      )
    }
  )
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

interface SidebarMenuSubButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
}

const SidebarMenuSubButton =
  React.forwardRef<HTMLButtonElement, SidebarMenuSubButtonProps>(
    ({ asChild, isActive, className, ...props }, ref) => {
      const Comp = asChild ? Slot : "button"

      return (
        <Comp
          ref={ref}
          data-active={isActive ? "true" : undefined}
          className={cn(
            "flex h-8 w-full items-center gap-2 whitespace-nowrap rounded-md px-2 text-left text-xs font-medium text-sidebar-foreground/70 transition-colors duration-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring disabled:cursor-not-allowed disabled:opacity-50 data-[active=true]:text-sidebar-foreground",
            className
          )}
          {...props}
        />
      )
    }
  )
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const SidebarMenuBadge =
  React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ className, ...props }, ref) => {
      const { state } = useSidebar()

      return (
        <span
          ref={ref}
          className={cn(
            "ml-auto text-xs text-sidebar-foreground/60 transition-opacity group-data-[state=collapsed]/sidebar:opacity-0",
            className
          )}
          {...props}
        />
      )
    }
  )
SidebarMenuBadge.displayName = "SidebarMenuBadge"

interface SidebarMenuSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  showIcon?: boolean
  level?: "1" | "2"
}

const SidebarMenuSkeleton =
  React.forwardRef<HTMLDivElement, SidebarMenuSkeletonProps>(
    ({ showIcon = true, level = "1", className, ...props }, ref) => {
      const { state } = useSidebar()

      const levelClass = {
        "1": "h-7 w-full",
        "2": "ml-5 h-7 w-[90%]",
      }

      return (
        <div
          ref={ref}
          className={cn(
            "flex animate-pulse items-center gap-2 rounded-md bg-sidebar-accent/60",
            levelClass[level],
            className
          )}
          {...props}
        >
          {showIcon && (
            <div
              className={cn(
                "ml-3 h-4 w-4 rounded-sm bg-sidebar-accent/80",
                state === "collapsed" && "ml-auto mr-auto"
              )}
            />
          )}
          <div
            className={cn(
              "h-4 w-1/2 rounded-sm bg-sidebar-accent/80",
              state === "collapsed" && "hidden"
            )}
          />
        </div>
      )
    }
  )
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarSeparator =
  React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement>>(
    ({ className, ...props }, ref) => {
      return (
        <hr
          ref={ref}
          className={cn("my-3 border-sidebar-border", className)}
          {...props}
        />
      )
    }
  )
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarTrigger =
  React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ className, children, ...props }, ref) => {
      const { toggleSidebar, state } = useSidebar()
      return (
        <button
          ref={ref}
          onClick={toggleSidebar}
          className={cn(
            "group/trigger flex size-9 items-center justify-center rounded-full text-sidebar-foreground/80 transition-colors duration-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300 ease-in-out",
              state === "collapsed" && "rotate-180"
            )}
          />
          {children}
        </button>
      )
    }
  )
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
      const { state } = useSidebar()

      if (state === "expanded") {
        return null
      }

      return (
        <aside
          ref={ref}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-14 flex-col border-r border-sidebar-border bg-sidebar-background",
            className
          )}
          {...props}
        >
          {children}
        </aside>
      )
    }
  )
SidebarRail.displayName = "SidebarRail"

const SidebarInset =
  React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      const { open } = useSidebar()

      return (
        <div
          ref={ref}
          className={cn(
            "ml-14 transition-[margin-left] duration-300 ease-in-out",
            open && "group-data-[variant=sidebar]/sidebar-wrapper:ml-[var(--sidebar-width)]",
            className
          )}
          {...props}
        />
      )
    }
  )
SidebarInset.displayName = "SidebarInset"

export {
  ForwardedSidebarProvider as SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  useSidebar,
  type SidebarContextProps,
} 