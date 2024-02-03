import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
    return (
        <section className=" min-h-[75vh] py-10 flex flex-col justify-center items-center">
            <Heading
                color="light"
                surtitle="From Redleeps"
                title="Welcome to Nodebook"
                subtitle="Nodebook is JS/TS playground for developers. It allows you to write and run code in the browser. It's like a REPL, but better."
                position="center"
            />
            <Link href="/app" className="mt-10">
                <Button size="lg">Get started</Button>
            </Link>
        </section>
    )
}