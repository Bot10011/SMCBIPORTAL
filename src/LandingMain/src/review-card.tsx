import { cn } from "@/lib/utils";
import Image from "next/image";

const ReviewCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string;
  name: string;
  username: string;
  body: string;
}) => {
  return (
    <figure
      className={cn(
        "relative h-full w-80 cursor-pointer shadow-2xl shadow-muted-foreground/15 overflow-hidden rounded border p-4 hover:bg-muted/50"
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <Image
          className="rounded-full"
          width="32"
          height="32"
          alt=""
          src={img}
        />
        <div className="flex flex-col">
          <figcaption className="font-medium">{name}</figcaption>
          <p className="text-sm font-medium">{username}</p>
        </div>
      </div>
      <blockquote className="mt-2">{body}</blockquote>
    </figure>
  );
};

export default ReviewCard;
