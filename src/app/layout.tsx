import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { AppDataProvider } from "@/components/AppDataProvider";
import { AppShell } from "@/components/AppShell";
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
        <Providers>
          <AppDataProvider>
            <AppShell>{children}</AppShell>
          </AppDataProvider>
        </Providers>
      </body>
    </html>
  );
}
