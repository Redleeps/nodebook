import * as React from 'react';
import { VariantProps, cva } from "class-variance-authority";
import { cn } from '@/lib/utils';

export type IHeadingProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & VariantProps<typeof titleVariants> & {
    subtitle?: React.ReactNode | React.ReactNode[];
    title?: React.ReactNode | React.ReactNode[];
    surtitle?: React.ReactNode | React.ReactNode[];
}

export default function Heading({ title, surtitle, subtitle, color, position, ...props }: IHeadingProps) {
    return (
        <div {...props} className={cn(containerVariant({position}), props.className)}>
            <h1 className={cn(surtitleVariants({ color, position }), !surtitle && 'hidden')}>{surtitle}</h1>
            <h2 className={cn(titleVariants({ color, position }), !title && 'hidden')}>{title}</h2>
            <h4 className={cn(subtitleVariants({ color, position }), !subtitle && 'hidden')}>{subtitle}</h4>
        </div>
    );
}

type IHeadingVariants = {
    color: {
        light: string;
        dark: string;
    }
    position: {
        left: string;
        center: string;
        right: string;
    }
} & object

const defaultVariants= {
    color: "light",
    position: "center"
} as const

const surtitleVariants = cva<IHeadingVariants>('text-base font-bold uppercase text-center mb-7', {
    variants: {
        color: {
            light: "text-yellowgreen",
            dark: "text-delft"
        },
        position: {
            left: "text-left",
            center: "text-center",
            right: "text-right"
        }
    },
    defaultVariants
})
const titleVariants = cva<IHeadingVariants>('text-3xl lg:text-4xl text-center mb-7', {
    variants: {
        color: {
            light: "text-white",
            dark: "text-delft"
        },
        position: {
            left: "text-left",
            center: "text-center",
            right: "text-right"
        }
    },
    defaultVariants
})
const subtitleVariants = cva<IHeadingVariants>('text-base text-center w-full', {
    variants: {
        color: {
            light: "text-white",
            dark: "text-delft"
        },
        position: {
            left: "text-left max-w-xl",
            center: "text-center max-w-md",
            right: "text-right"
        }
    },
    defaultVariants
})

const containerVariant = cva<Omit<IHeadingVariants, "color">>('flex flex-col w-full max-w-7xl mx-auto items-center', {
    variants: {
        position: {
            left: "items-start",
            center: "text-center",
            right: "items-end"
        }
    },
    defaultVariants
})
