import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";
import JSZip from "jszip";

async function generateQRForParticipant(participant: { name: string; role: string; token: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/scan?token=${participant.token}`, { margin: 1 });
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 500]);
  const qrImageResponse = await fetch(qrDataUrl);
  const qrImageArrayBuffer = await qrImageResponse.arrayBuffer();
  const qrImage = await pdfDoc.embedPng(qrImageArrayBuffer);
  
  page.drawText(`Hello ${participant.name},`, { x: 50, y: 450, size: 24, color: rgb(0, 0, 0) });
  page.drawText(`Role: ${participant.role || "Participant"}`, { x: 50, y: 410, size: 18, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(`Present this code at the event scanners:`, { x: 50, y: 380, size: 14, color: rgb(0, 0, 0) });
  page.drawImage(qrImage, { x: 50, y: 50, width: 300, height: 300 });
  
  return await pdfDoc.save();
}

export async function POST(req: NextRequest) {
  try {
    const authRole = req.cookies.get("auth_role")?.value;
    if (authRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { ids, master } = await req.json();

    if (master) {
      const pdfBytes = await generateQRForParticipant({
        name: "Master Key",
        role: "Admin Master",
        token: "MASTER_QR_UNLIMITED",
      });
      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Master_QR.pdf"`,
        },
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No participants provided" }, { status: 400 });
    }

    const { data: participants, error } = await supabase
      .from("participants")
      .select("id, name, role, token")
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: "No participants found" }, { status: 404 });
    }

    if (participants.length === 1) {
      const p = participants[0];
      const pdfBytes = await generateQRForParticipant(p);
      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="QR_${p.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`,
        },
      });
    }

    const zip = new JSZip();
    for (const p of participants) {
      const pdfBytes = await generateQRForParticipant(p);
      zip.file(`QR_${p.name.replace(/[^a-z0-9]/gi, '_')}.pdf`, pdfBytes);
    }
    const zipBuffer = await zip.generateAsync({ type: "uint8array" });
    
    return new NextResponse(Buffer.from(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Bulk_QRs.zip"`,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
