'use client'

import 'raqam/locales/fa'

import { useRef } from 'react'

import { Input, Label } from '@heroui/react'
import { useNumberField, useNumberFieldState } from 'raqam'
import type { UseNumberFieldStateOptions } from 'raqam'
import { useController } from 'react-hook-form'
import type { Control, FieldValues, Path } from 'react-hook-form'

export interface NumberInputProps {
  value?: number | null
  onChange?: (value: number | null) => void
  onBlur?: () => void
  formatOptions?: Intl.NumberFormatOptions
  locale?: string
  minValue?: number
  maxValue?: number
  allowDecimal?: boolean
  allowNegative?: boolean
  label?: string
  description?: string
  errorMessage?: string
  placeholder?: string
  suffix?: string
  autoFocus?: boolean
  isDisabled?: boolean
  name?: string
}

const groupClass =
  '!inline-flex !h-auto min-h-11 w-full min-w-0 items-stretch overflow-hidden ' +
  'rounded-xl border border-border/80 bg-surface/40 shadow-none transition-colors ' +
  'focus-within:border-primary/40 focus-within:bg-surface ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const suffixClass =
  'flex max-w-[40%] shrink-0 items-center border-border/50 border-s px-3 ' +
  'font-medium text-muted-foreground text-sm tabular-nums'

export function NumberInput({
  value,
  onChange,
  onBlur,
  formatOptions,
  locale,
  minValue,
  maxValue,
  allowDecimal,
  allowNegative,
  label,
  description,
  errorMessage,
  placeholder,
  suffix,
  autoFocus,
  isDisabled,
  name,
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const stateOptions: UseNumberFieldStateOptions = {
    value: value ?? null,
    onChange,
    formatOptions,
    locale,
    minValue,
    maxValue,
    allowDecimal,
    allowNegative,
    disabled: isDisabled,
  }

  const state = useNumberFieldState(stateOptions)

  // Pass onBlur to useNumberField — it merges it with state.commit() internally
  const { inputProps, labelProps } = useNumberField(
    {
      label,
      'aria-label': label,
      name,
      onBlur: () => onBlur?.(),
    },
    state,
    inputRef,
  )

  const isInvalid = !!errorMessage

  return (
    <div>
      {label ? (
        <Label {...labelProps} className="font-medium text-sm">
          {label}
        </Label>
      ) : null}
      {description ? (
        <p className="mt-0.5 text-foreground/80 text-sm tabular-nums">
          {description}
        </p>
      ) : null}
      <div
        className="mt-2 min-w-0"
        dir="ltr"
        data-invalid={isInvalid || undefined}
        data-disabled={isDisabled || undefined}
      >
        <div className={groupClass}>
          <Input
            {...inputProps}
            ref={inputRef}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="min-h-11 min-w-0 flex-1 border-0 bg-transparent py-2.5 ps-3 pe-2 leading-normal shadow-none outline-none focus-visible:ring-0"
          />
          {suffix ? (
            <span aria-hidden className={suffixClass}>
              {suffix}
            </span>
          ) : null}
        </div>
      </div>
      {errorMessage ? (
        <p role="alert" className="mt-1 text-destructive text-xs">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

// React Hook Form controller wrapper
interface NumberInputControllerProps<T extends FieldValues>
  extends Omit<NumberInputProps, 'value' | 'onBlur' | 'name'> {
  name: Path<T>
  control: Control<T>
}

export function NumberInputController<T extends FieldValues>({
  name,
  control,
  onChange: onChangeProp,
  ...rest
}: NumberInputControllerProps<T>) {
  const { field, fieldState } = useController({ name, control })

  return (
    <NumberInput
      {...rest}
      name={name}
      value={field.value ?? null}
      onChange={(val) => {
        field.onChange(val ?? null)
        onChangeProp?.(val)
      }}
      onBlur={field.onBlur}
      errorMessage={fieldState.error?.message}
    />
  )
}
