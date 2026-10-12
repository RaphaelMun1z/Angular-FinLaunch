import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ApiStatusComponent } from "./shared/components/api-status.component";

@Component({ selector: "app-root", standalone: true, imports: [RouterOutlet, ApiStatusComponent], template: "<router-outlet /><app-api-status />", changeDetection: ChangeDetectionStrategy.OnPush })
export class AppComponent {}
