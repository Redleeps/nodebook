"use client";
import dayjs from '@/lib/dayjs';
import * as React from 'react';

export interface IDateComponentProps {
    date: Parameters<typeof dayjs>[0]
    from?: Parameters<typeof dayjs>[0]
    to?: Parameters<typeof dayjs>[0]
    fromNow?: boolean
    format?: string
}

export default function DateComponent({ date, from, to, fromNow, format }: IDateComponentProps) {
    const [hydrated, setHydrated] = React.useState(false)
    const [now, setNow] = React.useState(Date.now())
    React.useEffect(() => {
        setHydrated(true)
    }, [])
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setNow(Date.now())
        }, 10_000)
        return () => {
            clearTimeout(timeout)
        }
    }, [now])

    if (!hydrated) return <span className="bg-slate-200 rounded">{new Array(24).fill(0).map((_, i) => (<React.Fragment key={i}>&nbsp;</React.Fragment>))}</span>

    if (fromNow) {
        return <>{dayjs(date).fromNow(false)}</>
    }
    if (from) {
        return <>{dayjs(date).from(from, false)}</>
    }
    if (to) {
        return <>{dayjs(date).to(to, false)}</>
    }
    if(format) {
        return <>{dayjs(date).format(format)}</>
    }
    if (dayjs(date).isSame(now, 'day')) {
        return <>{dayjs(date).format('HH:mm')}</>
    }

    return <>{dayjs(date).format('DD.MM.YYYY')}</>
}
