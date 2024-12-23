import { cn, formatDateTime } from '@/lib/utils';
import React from 'react'

export const FormatedDateTime = ({
    date, 
    className
}: {
    date: string; 
    className?: string
}) => {
  return (
    <p className={cn('body-2 text-light-200', className)}>
        {formatDateTime(date)}
    </p>
  );
};

export default FormatedDateTime