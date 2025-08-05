"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Target,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"
import { QuestionType, DifficultyLevel } from "@prisma/client"

interface Question {
  id: string
  title: string
  content: string
  type: QuestionType
  options: string[]
  correctAnswer: string
  explanation?: string
  difficulty: DifficultyLevel
  order: number
  points: number
}

interface QuizAttempt {
  id: string
  quizId: string
  status: string
  timeLimit?: number
  startedAt: string
  questions: Question[]
}

export default function QuizTakingPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string

  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)

  useEffect(() => {
    fetchQuizAttempt()
  }, [quizId])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev <= 1) {
          clearInterval(timer)
          handleSubmitQuiz(true) // Auto-submit when time runs out
          return 0
        }
        return prev ? prev - 1 : null
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const fetchQuizAttempt = async () => {
    try {
      const response = await fetch(`/api/user/quiz/${quizId}/attempt`)
      if (response.ok) {
        const data = await response.json()
        setQuizAttempt(data)
        
        // Set time limit if available
        if (data.timeLimit) {
          const startTime = new Date(data.startedAt).getTime()
          const elapsed = Math.floor((Date.now() - startTime) / 1000)
          const remaining = Math.max(0, data.timeLimit * 60 - elapsed)
          setTimeLeft(remaining)
        }

        // Load existing answers
        const existingAnswers: Record<string, string> = {}
        data.answers?.forEach((answer: any) => {
          existingAnswers[answer.questionId] = answer.userAnswer
        })
        setAnswers(existingAnswers)
      } else {
        toast.error("Failed to load quiz")
        router.push("/user/quiz")
      }
    } catch (error) {
      toast.error("Failed to load quiz")
      router.push("/user/quiz")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))

    // Save answer to backend
    saveAnswer(questionId, answer)
  }

  const saveAnswer = async (questionId: string, answer: string) => {
    try {
      await fetch(`/api/user/quiz/${quizId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          answer
        }),
      })
    } catch (error) {
      console.error("Failed to save answer:", error)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < (quizAttempt?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmitQuiz = async (autoSubmit = false) => {
    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/user/quiz/${quizId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
          autoSubmit
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setQuizCompleted(true)
        toast.success(autoSubmit ? "Time's up! Quiz submitted automatically." : "Quiz submitted successfully!")
        
        // Redirect to results after a short delay
        setTimeout(() => {
          router.push(`/user/quiz/${quizId}/result`)
        }, 2000)
      } else {
        toast.error("Failed to submit quiz")
      }
    } catch (error) {
      toast.error("Failed to submit quiz")
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  const getAnsweredCount = () => {
    return Object.keys(answers).filter(questionId => answers[questionId]).length
  }

  const getCurrentQuestion = () => {
    if (!quizAttempt || !quizAttempt.questions[currentQuestionIndex]) {
      return null
    }
    return quizAttempt.questions[currentQuestionIndex]
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading quiz...</div>
  }

  if (!quizAttempt) {
    return <div className="flex items-center justify-center h-64">Quiz not found</div>
  }

  if (quizCompleted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Quiz Submitted!</CardTitle>
            <CardDescription>
              Your quiz has been submitted successfully. Redirecting to results...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const currentQuestion = getCurrentQuestion()
  const progress = ((currentQuestionIndex + 1) / quizAttempt.questions.length) * 100
  const answeredCount = getAnsweredCount()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{quizAttempt.quizId}</CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {quizAttempt.questions.length}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {timeLeft !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span className={timeLeft < 60 ? "text-red-600 font-medium" : ""}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
              <Badge variant="outline">
                {answeredCount}/{quizAttempt.questions.length} answered
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{currentQuestion?.title}</CardTitle>
              <CardDescription className="mt-2">
                {currentQuestion?.content}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={
                currentQuestion?.difficulty === DifficultyLevel.EASY ? "default" :
                currentQuestion?.difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
              }>
                {currentQuestion?.difficulty}
              </Badge>
              <Badge variant="outline">
                {currentQuestion?.points} points
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion?.type === QuestionType.MULTIPLE_CHOICE && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              {currentQuestion.options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion?.type === QuestionType.TRUE_FALSE && (
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="True" id="true" />
                <Label htmlFor="true" className="cursor-pointer">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="False" id="false" />
                <Label htmlFor="false" className="cursor-pointer">False</Label>
              </div>
            </RadioGroup>
          )}

          {currentQuestion?.type === QuestionType.FILL_IN_BLANK && (
            <Input
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              placeholder="Enter your answer..."
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === quizAttempt.questions.length - 1 ? (
            <Button onClick={() => setShowConfirmDialog(true)} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {quizAttempt.questions.map((question, index) => (
              <Button
                key={question.id}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                className="aspect-square p-0"
                onClick={() => setCurrentQuestionIndex(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your quiz? You have answered {answeredCount} out of {quizAttempt.questions.length} questions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSubmitQuiz()} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}