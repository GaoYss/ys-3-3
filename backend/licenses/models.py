from django.db import models
from django.utils import timezone


class License(models.Model):
    class LicenseType(models.TextChoices):
        BUSINESS = "business", "营业执照"
        PERMIT = "permit", "经营许可"
        QUALIFICATION = "qualification", "资质证书"
        TAX = "tax", "税务证照"
        OTHER = "other", "其他"

    class Status(models.TextChoices):
        ACTIVE = "active", "有效"
        EXPIRING = "expiring", "即将到期"
        EXPIRED = "expired", "已到期"
        ARCHIVED = "archived", "已归档"

    name = models.CharField("证照名称", max_length=120)
    license_no = models.CharField("证照编号", max_length=80, unique=True)
    license_type = models.CharField("证照类型", max_length=32, choices=LicenseType.choices)
    issuing_authority = models.CharField("发证机关", max_length=120)
    owner_department = models.CharField("归属部门", max_length=80)
    keeper = models.CharField("保管人", max_length=60, blank=True)
    issue_date = models.DateField("发证日期")
    expiry_date = models.DateField("到期日期")
    reminder_days = models.PositiveIntegerField("提前提醒天数", default=30)
    status = models.CharField("状态", max_length=32, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField("备注", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["expiry_date", "name"]

    def __str__(self):
        return self.name

    @property
    def days_until_expiry(self):
        return (self.expiry_date - timezone.localdate()).days

    @property
    def computed_status(self):
        if self.status == self.Status.ARCHIVED:
            return self.Status.ARCHIVED
        days_left = self.days_until_expiry
        if days_left < 0:
            return self.Status.EXPIRED
        if days_left <= self.reminder_days:
            return self.Status.EXPIRING
        return self.Status.ACTIVE

    @property
    def is_currently_borrowed(self):
        if hasattr(self, "_is_borrowed"):
            return self._is_borrowed
        return self.borrow_records.filter(
            status__in=[BorrowRecord.Status.BORROWED, BorrowRecord.Status.OVERDUE]
        ).exists()

    @property
    def borrow_unavailable_reason(self):
        computed = self.computed_status
        if computed == self.Status.ARCHIVED:
            return "证照已归档，不能借出"
        if computed == self.Status.EXPIRED:
            return "证照已过期，不能借出"
        if self.is_currently_borrowed:
            return "证照已借出，不能重复借出"
        return None

    @property
    def can_borrow(self):
        return self.borrow_unavailable_reason is None


class BorrowRecord(models.Model):
    class Status(models.TextChoices):
        BORROWED = "borrowed", "借出中"
        RETURNED = "returned", "已归还"
        OVERDUE = "overdue", "逾期未还"

    license = models.ForeignKey(License, on_delete=models.CASCADE, related_name="borrow_records", verbose_name="证照")
    borrower = models.CharField("借用人", max_length=60)
    borrower_department = models.CharField("借用部门", max_length=80)
    purpose = models.CharField("用途", max_length=200)
    borrow_date = models.DateField("借出日期", default=timezone.localdate)
    expected_return_date = models.DateField("预计归还日期")
    actual_return_date = models.DateField("实际归还日期", null=True, blank=True)
    status = models.CharField("状态", max_length=32, choices=Status.choices, default=Status.BORROWED)
    notes = models.TextField("备注", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-borrow_date", "-created_at"]

    def __str__(self):
        return f"{self.license.name} - {self.borrower}"

    @property
    def computed_status(self):
        if self.actual_return_date:
            return self.Status.RETURNED
        if self.expected_return_date < timezone.localdate():
            return self.Status.OVERDUE
        return self.Status.BORROWED
