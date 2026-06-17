import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { Providers } from "@/components/Providers";
import { AppDataProvider } from "@/components/AppDataProvider";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

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
    <html lang="th" className={notoSansThai.variable}>
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
