import { Badge } from "@/components/catalyst-ui-kit/badge.tsx";
import { FireIcon } from "@heroicons/react/16/solid";

export default function MostPopularBadge() {
    return (
        <Badge color={"amber"}>
            <FireIcon className={"h-5"} />
            Most Popular
        </Badge>
    );
}
