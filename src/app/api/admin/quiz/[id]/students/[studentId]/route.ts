import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id, studentId } = await params

    // Check if quiz exists
    const quiz = await db.quiz.findUnique({
      where: { id }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    // Check if student exists
    const student = await db.user.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 }
      )
    }

    // Delete the quiz attempt for this student and quiz
    const deletedAttempt = await db.quizAttempt.deleteMany({
      where: {
        userId: studentId,
        quizId: id
      }
    })

    if (deletedAttempt.count === 0) {
      return NextResponse.json(
        { message: "Student is not enrolled in this quiz" },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      message: "Student unenrolled successfully" 
    })
  } catch (error) {
    console.error("Error unenrolling student:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}