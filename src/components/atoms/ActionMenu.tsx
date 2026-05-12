import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MoreVertical } from 'lucide-react'

export interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  className?: string
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  /** aria-label for the trigger button */
  ariaLabel?: string
  /** Size of the MoreVertical icon */
  iconSize?: number
  /** Additional class for the trigger button */
  triggerClassName?: string
}

/**
 * A reusable kebab (three-dot) menu that opens a context dropdown.
 * Supports keyboard navigation, outside-click dismissal, and focus management.
 */
export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  ariaLabel = 'Więcej opcji',
  iconSize = 18,
  triggerClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && itemRefs.current[0]) {
      itemRefs.current[0].focus()
    }
  }, [isOpen])

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsOpen((prev) => !prev)
    },
    []
  )

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen(true)
      }
    },
    []
  )

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      e.stopPropagation()

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = (index + 1) % items.length
        itemRefs.current[next]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = (index - 1 + items.length) % items.length
        itemRefs.current[prev]?.focus()
      } else if (e.key === 'Tab') {
        setIsOpen(false)
      }
    },
    [items.length]
  )

  const handleItemClick = useCallback(
    (e: React.MouseEvent, item: ActionMenuItem) => {
      e.stopPropagation()
      setIsOpen(false)
      item.onClick()
    },
    []
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        className={`p-2 hover:bg-slate-600 rounded-lg transition-colors text-slate-400 hover:text-slate-200 ${triggerClassName}`}
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical size={iconSize} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          className="absolute right-0 top-full mt-1 min-w-[160px] bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50 py-1 animate-in fade-in"
        >
          {items.map((item, index) => (
            <button
              key={index}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              role="menuitem"
              onClick={(e) => handleItemClick(e, item)}
              onKeyDown={(e) => handleMenuKeyDown(e, index)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-slate-600 focus:bg-slate-600 focus:outline-none ${item.className || ''}`}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
