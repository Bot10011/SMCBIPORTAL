import logoBlack from "@/assets/images/logoblack.svg";
import Image from "next/image";



export default function Footer() {
  return (
    <footer className="bg-muted border-t border py-8">
      <div className="max-w-5xl mx-auto px-4 xl:px-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Brand */}
          <div className="relative w-full">
            <Image
              src={logoBlack}
              alt="Logo"
              className="w-15 h-15 mx-auto sm:mx-0"
            />
          </div>

        

          {/* Copyright */}
          <div className="text-sm text-muted-foreground text-center sm:text-right w-full">
            {`${new Date().getFullYear()} © `}
             SMCBI.
          </div>
        </div>
      </div>
    </footer>
  );
}
