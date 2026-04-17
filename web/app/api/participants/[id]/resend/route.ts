import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authRole = req.cookies.get("auth_role")?.value;
    if (authRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: participant, error } = await supabase
      .from("participants")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !participant) {
      return NextResponse.json({ error: error?.message || "Participant not found" }, { status: 404 });
    }

    const { name, email, role, token } = participant;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const qrDataUrl = await QRCode.toDataURL(`${appUrl}/scan?token=${token}`, { margin: 1 });
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 500]);
    const qrImageResponse = await fetch(qrDataUrl);
    const qrImageArrayBuffer = await qrImageResponse.arrayBuffer();
    const qrImage = await pdfDoc.embedPng(qrImageArrayBuffer);
    
    page.drawText(`Hello ${name},`, { x: 50, y: 450, size: 24, color: rgb(0, 0, 0) });
    page.drawText(`Role: ${role}`, { x: 50, y: 410, size: 18, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(`Present this code at the event scanners:`, { x: 50, y: 380, size: 14, color: rgb(0, 0, 0) });
    page.drawImage(qrImage, { x: 50, y: 50, width: 300, height: 300 });
    
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || "dummy_user",
        pass: process.env.SMTP_PASS || "dummy_pass",
      },
    });

    await transporter.sendMail({
      from: '"Team CRPLPJ" <no-reply@event.com>',
      to: email,
      subject: "Event QR Coupon for lunch",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h2 style="color: #4F46E5;">Hello, ${name}!</h2>
          <p>We are delighted to share your official QR Coupon for lunch.</p>
          <p>Please find your personalized PDF pass attached to this email. You will need to present it at the scanning desk to verify your attendance and meal allocation.</p>
          <p><strong>Role:</strong> ${role}</p>
          <p style="margin-bottom: 30px;">If you experience any difficulties opening the attachment, your manual reference token is: <strong>${token}</strong></p>
          
          <p style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <em><strong>Thanks and Regards, <br/>
            Centre for Research in Public Law, Policy and Jurisprudence <br/>
            Maharashtra National Law University Mumbai.</strong></em>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'Event_QR_Pass.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        }
      ]
    });

    return NextResponse.json({ success: true, participant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
