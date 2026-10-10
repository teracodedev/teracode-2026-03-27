import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * API ルートの例外をレスポンスに変換する。
 * Prisma のエラーメッセージにはクエリ内容やテーブル・カラム名が含まれるため、
 * 詳細はサーバーログにだけ残し、クライアントには汎用メッセージを返す。
 */
export function apiErrorResponse(
  context: string,
  error: unknown,
  fallbackMessage = "エラーが発生しました"
): NextResponse {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025":
        return NextResponse.json({ error: "対象のデータが見つかりません" }, { status: 404 });
      case "P2002":
        return NextResponse.json({ error: "同じ内容のデータが既に登録されています" }, { status: 409 });
      case "P2003":
        return NextResponse.json({ error: "関連するデータが見つかりません" }, { status: 400 });
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.warn(`${context} validation error:`, error.message);
    return NextResponse.json({ error: "入力内容が正しくありません" }, { status: 400 });
  }
  console.error(`${context} error:`, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
