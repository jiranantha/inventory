import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบจัดเก็บและตรวจสอบครุภัณฑ์องค์กรนักศึกษา",
  description: "ระบบบริหารจัดการครุภัณฑ์ ฝ่าย/ชมรม มหาวิทยาลัยเชียงใหม่",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
