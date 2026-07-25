from dataclasses import dataclass
from typing import Generic, TypeVar, cast

T = TypeVar("T")
E = TypeVar("E")


@dataclass(frozen=True)
class Result(Generic[T, E]):
    _value: T | None = None
    _error: E | None = None

    @classmethod
    def ok(cls, value: T) -> "Result[T, E]":
        return cls(_value=value)

    @classmethod
    def err(cls, error: E) -> "Result[T, E]":
        return cls(_error=error)

    @property
    def is_ok(self) -> bool:
        return self._error is None

    @property
    def is_err(self) -> bool:
        return not self.is_ok

    @property
    def value(self) -> T:
        if self.is_err:
            raise RuntimeError("실패 결과에는 값이 없습니다.")
        return cast(T, self._value)

    @property
    def error(self) -> E:
        if self.is_ok:
            raise RuntimeError("성공 결과에는 오류가 없습니다.")
        return cast(E, self._error)
